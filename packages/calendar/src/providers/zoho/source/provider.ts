import {
  calendarAccountsTable,
  calendarsTable,
  eventStatesTable,
  oauthCredentialsTable,
} from "@keeper.sh/database/schema";
import { and, arrayContains, eq, gt, inArray, lt, or } from "drizzle-orm";
import type { BunSQLDatabase } from "drizzle-orm/bun-sql";

import { buildSourceEventStateIdsToRemove, buildSourceEventsToAdd } from "../../../core/source/event-diff";
import {
  filterSourceEventsToSyncWindow,
  resolveSourceSyncTokenAction,
  splitSourceEventsByStorageIdentity,
} from "../../../core/source/sync-diagnostics";
import { insertEventStatesWithConflictResolution } from "../../../core/source/write-event-states";
import { OAuthSourceProvider, type ProcessEventsOptions } from "../../../core/oauth/source-provider";
import type { FetchEventsResult as BaseFetchEventsResult } from "../../../core/oauth/source-provider";
import { createOAuthSourceProvider, type SourceProvider } from "../../../core/oauth/create-source-provider";
import { getOAuthSyncWindow } from "../../../core/oauth/sync-window";
import type { OAuthTokenProvider } from "../../../core/oauth/token-provider";
import type { RefreshLockStore } from "../../../core/oauth/refresh-coordinator";
import {
  buildProviderMetadata,
  getCalendarApiBaseFromMetadata,
  getRegionFromMetadata,
  resolveZohoRegion,
  ZOHO_DEFAULT_REGION,
} from "../../../core/oauth/zoho";
import type { ZohoProviderMetadata } from "../../../core/oauth/zoho";
import type { OAuthSourceConfig, SourceEvent, SourceSyncResult } from "../../../core/types";

import { fetchCalendarEvents, fetchCalendarName, parseZohoEvents } from "./utils/fetch-events";

const ZOHO_PROVIDER_ID = "zoho";
const EMPTY_COUNT = 0;
const YEARS_UNTIL_FUTURE = 2;

const stringifyIfPresent = (value: unknown): string | undefined => {
  if (!value) {
    return;
  }
  return JSON.stringify(value);
};

interface ZohoSourceConfig extends OAuthSourceConfig {
  originalName: string | null;
  sourceName: string;
  providerMetadata: ZohoProviderMetadata;
}

class ZohoSourceProvider extends OAuthSourceProvider<ZohoSourceConfig> {
  readonly name = "Zoho Calendar";
  readonly providerId = ZOHO_PROVIDER_ID;

  protected oauthProvider: OAuthTokenProvider;

  constructor(config: ZohoSourceConfig, oauthProvider: OAuthTokenProvider) {
    super(config);
    this.oauthProvider = oauthProvider;
  }

  /**
   * Zoho uses a custom auth scheme, not OAuth2 Bearer. Overrides the base
   * provider's header builder which would emit `Bearer <token>`.
   */
  protected override get headers(): Record<string, string> {
    return {
      Authorization: `Zoho-oauthtoken ${this.currentAccessToken}`,
      "Content-Type": "application/json",
    };
  }

  /**
   * Region routing hint for token refresh. The OAuth token URL differs per
   * Zoho datacenter (us/eu/in/au) — the base class threads this through to
   * the OAuth provider's `refreshAccessToken({ region })`.
   */
  protected override getRefreshRegion(): string | undefined {
    return this.config.providerMetadata.region;
  }

  async fetchEvents(_syncToken: string | null): Promise<BaseFetchEventsResult> {
    await this.refreshOriginalName();

    const calendarApiBase = getCalendarApiBaseFromMetadata(this.config.providerMetadata);
    const result = await fetchCalendarEvents({
      accessToken: this.currentAccessToken,
      calendarApiBase,
      externalCalendarId: this.config.externalCalendarId,
    });

    const events = parseZohoEvents(result.events);

    return {
      events,
      fullSyncRequired: false,
      isDeltaSync: false,
    };
  }

  protected async processEvents(
    events: SourceEvent[],
    options: ProcessEventsOptions,
  ): Promise<SourceSyncResult> {
    const { database, calendarId } = this.config;
    const { nextSyncToken, isDeltaSync, cancelledEventUids } = options;
    const syncWindow = getOAuthSyncWindow(YEARS_UNTIL_FUTURE);
    const {
      events: eventsInWindow,
      filteredCount: eventsFilteredOutOfWindow,
    } = filterSourceEventsToSyncWindow(events, syncWindow);

    await ZohoSourceProvider.removeOutOfRangeEvents(database, calendarId, syncWindow);

    const existingEvents = await database
      .select({
        availability: eventStatesTable.availability,
        endTime: eventStatesTable.endTime,
        id: eventStatesTable.id,
        isAllDay: eventStatesTable.isAllDay,
        sourceEventType: eventStatesTable.sourceEventType,
        sourceEventUid: eventStatesTable.sourceEventUid,
        startTime: eventStatesTable.startTime,
      })
      .from(eventStatesTable)
      .where(eq(eventStatesTable.calendarId, calendarId));

    const eventsToAdd = buildSourceEventsToAdd(existingEvents, eventsInWindow, { isDeltaSync });
    const eventStateIdsToRemove = buildSourceEventStateIdsToRemove(
      existingEvents,
      eventsInWindow,
      { cancelledEventUids, isDeltaSync },
    );
    const { eventsToInsert, eventsToUpdate } = splitSourceEventsByStorageIdentity(
      existingEvents,
      eventsToAdd,
    );

    if (eventStateIdsToRemove.length > EMPTY_COUNT || eventsToAdd.length > EMPTY_COUNT) {
      await database.transaction(async (transactionDatabase) => {
        if (eventStateIdsToRemove.length > EMPTY_COUNT) {
          await transactionDatabase
            .delete(eventStatesTable)
            .where(
              and(
                eq(eventStatesTable.calendarId, calendarId),
                inArray(eventStatesTable.id, eventStateIdsToRemove),
              ),
            );
        }

        if (eventsToAdd.length > EMPTY_COUNT) {
          await insertEventStatesWithConflictResolution(
            transactionDatabase,
            eventsToAdd.map((event) => ({
              availability: event.availability,
              calendarId,
              description: event.description,
              endTime: event.endTime,
              exceptionDates: stringifyIfPresent(event.exceptionDates),
              isAllDay: event.isAllDay,
              location: event.location,
              recurrenceRule: stringifyIfPresent(event.recurrenceRule),
              sourceEventType: event.sourceEventType ?? "default",
              sourceEventUid: event.uid,
              startTime: event.startTime,
              startTimeZone: event.startTimeZone,
              title: event.title,
            })),
          );
        }
      });
    }

    const syncTokenAction = resolveSourceSyncTokenAction(nextSyncToken, isDeltaSync);
    if (syncTokenAction.shouldResetSyncToken) {
      await this.clearSyncToken();
    }

    return {
      eventsAdded: eventsToInsert.length,
      eventsFilteredOutOfWindow,
      eventsInserted: eventsToInsert.length,
      eventsRemoved: eventStateIdsToRemove.length,
      eventsUpdated: eventsToUpdate.length,
      syncTokenResetCount: Number(syncTokenAction.shouldResetSyncToken),
      syncToken: nextSyncToken,
    };
  }

  private async refreshOriginalName(): Promise<void> {
    const calendarApiBase = getCalendarApiBaseFromMetadata(this.config.providerMetadata);
    const remoteCalendarName = await fetchCalendarName({
      accessToken: this.currentAccessToken,
      calendarApiBase,
      externalCalendarId: this.config.externalCalendarId,
    });

    if (!remoteCalendarName || remoteCalendarName === this.config.originalName) {
      return;
    }

    await this.config.database
      .update(calendarsTable)
      .set({ originalName: remoteCalendarName })
      .where(eq(calendarsTable.id, this.config.calendarId));

    this.config.originalName = remoteCalendarName;
  }

  private static async removeOutOfRangeEvents(
    database: BunSQLDatabase,
    calendarId: string,
    syncWindow: { timeMin: Date; timeMax: Date },
  ): Promise<void> {
    await database
      .delete(eventStatesTable)
      .where(
        and(
          eq(eventStatesTable.calendarId, calendarId),
          or(
            lt(eventStatesTable.endTime, syncWindow.timeMin),
            gt(eventStatesTable.startTime, syncWindow.timeMax),
          ),
        ),
      );
  }
}

interface ZohoSourceAccount {
  calendarId: string;
  userId: string;
  externalCalendarId: string;
  syncToken: string | null;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  credentialId: string;
  oauthCredentialId: string;
  calendarAccountId: string;
  provider: string;
  originalName: string | null;
  sourceName: string;
  providerMetadata: ZohoProviderMetadata;
}

interface CreateZohoSourceProviderConfig {
  database: BunSQLDatabase;
  oauthProvider: OAuthTokenProvider;
  refreshLockStore?: RefreshLockStore | null;
}

/**
 * Resolves provider metadata from the value stored in `oauth_credentials.provider_metadata`.
 * Falls back to the default region (US) if missing/malformed — should not happen
 * post-Slice 1 for new connections, but tolerates legacy rows.
 */
const resolveProviderMetadata = (raw: unknown): ZohoProviderMetadata => {
  if (raw && typeof raw === "object") {
    const region = resolveZohoRegion(getRegionFromMetadata(raw));
    const calendarApiBase = getCalendarApiBaseFromMetadata(raw);
    return { calendarApiBase, region };
  }
  return buildProviderMetadata(ZOHO_DEFAULT_REGION);
};

const getZohoSourcesWithCredentials = async (
  database: BunSQLDatabase,
): Promise<ZohoSourceAccount[]> => {
  const sources = await database
    .select({
      accessToken: oauthCredentialsTable.accessToken,
      accessTokenExpiresAt: oauthCredentialsTable.expiresAt,
      calendarAccountId: calendarAccountsTable.id,
      calendarId: calendarsTable.id,
      credentialId: oauthCredentialsTable.id,
      externalCalendarId: calendarsTable.externalCalendarId,
      oauthCredentialId: oauthCredentialsTable.id,
      originalName: calendarsTable.originalName,
      provider: calendarAccountsTable.provider,
      providerMetadata: oauthCredentialsTable.providerMetadata,
      refreshToken: oauthCredentialsTable.refreshToken,
      sourceName: calendarsTable.name,
      syncToken: calendarsTable.syncToken,
      userId: calendarsTable.userId,
    })
    .from(calendarsTable)
    .innerJoin(calendarAccountsTable, eq(calendarsTable.accountId, calendarAccountsTable.id))
    .innerJoin(
      oauthCredentialsTable,
      eq(calendarAccountsTable.oauthCredentialId, oauthCredentialsTable.id),
    )
    .where(
      and(
        eq(calendarsTable.calendarType, "oauth"),
        arrayContains(calendarsTable.capabilities, ["pull"]),
        eq(calendarAccountsTable.provider, ZOHO_PROVIDER_ID),
        eq(calendarAccountsTable.needsReauthentication, false),
      ),
    );

  return sources.flatMap((source) => {
    if (!source.externalCalendarId) {
      return [];
    }
    return [{
      ...source,
      externalCalendarId: source.externalCalendarId,
      provider: source.provider,
      providerMetadata: resolveProviderMetadata(source.providerMetadata),
    }];
  });
};

const createZohoSourceProvider = (config: CreateZohoSourceProviderConfig): SourceProvider => {
  const { database, oauthProvider, refreshLockStore } = config;

  return createOAuthSourceProvider<ZohoSourceAccount, ZohoSourceConfig>({
    buildConfig: (db, account) => ({
      accessToken: account.accessToken,
      accessTokenExpiresAt: account.accessTokenExpiresAt,
      calendarAccountId: account.calendarAccountId,
      calendarId: account.calendarId,
      database: db,
      externalCalendarId: account.externalCalendarId,
      oauthCredentialId: account.oauthCredentialId,
      originalName: account.originalName,
      providerMetadata: account.providerMetadata,
      refreshToken: account.refreshToken,
      sourceName: account.sourceName,
      syncToken: account.syncToken,
      userId: account.userId,
    }),
    createProviderInstance: (providerConfig, oauth) =>
      new ZohoSourceProvider(providerConfig, oauth),
    database,
    getAllSources: getZohoSourcesWithCredentials,
    oauthProvider,
    refreshLockStore,
  });
};

export {
  createZohoSourceProvider,
  ZohoSourceProvider,
  resolveProviderMetadata,
};
export type { CreateZohoSourceProviderConfig, ZohoSourceAccount, ZohoSourceConfig };
