/**
 * TEMPORARY DEV endpoint: dumps the keeper-side state of the user's Zoho
 * sources. Used to verify post-connect that:
 *   1. All 7 Zoho calendars (1 personal + 6 group) are persisted with hex
 *      UIDs as externalCalendarId (no pgroup-* leftover).
 *   2. EventStates rows are partitioned correctly per calendar — no event
 *      should leak across calendars.
 *   3. sourceEventUid follows Zoho's "<hash>@zoho.com" format (not the
 *      calendar's UID — verifies the caluid bug fix).
 *
 * Auth-protected; user-scoped (only sees its own data).
 * Removed once we declare the Zoho provider production-clean.
 */
import {
  calendarAccountsTable,
  calendarsTable,
  eventStatesTable,
  oauthCredentialsTable,
} from "@keeper.sh/database/schema";
import { and, eq, inArray } from "drizzle-orm";
import { withAuth, withWideEvent } from "@/utils/middleware";
import { database } from "@/context";

const SAMPLE_EVENTS_PER_CALENDAR = 5;

interface CalendarSummary {
  keeperCalendarId: string;
  name: string;
  externalCalendarId: string | null;
  capabilities: string[] | null;
  syncToken: string | null;
  eventCount: number;
  sampleEvents: Array<{
    sourceEventUid: string;
    title: string | null;
    startTime: Date;
    endTime: Date;
    looksLikeZohoEventUid: boolean;
  }>;
}

interface AccountSummary {
  accountId: string;
  email: string | null;
  needsReauthentication: boolean;
  oauthCredentialId: string | null;
  providerMetadata: unknown;
  calendars: CalendarSummary[];
}

const isZohoEventUid = (uid: string): boolean => /@zoho(\.com|\.eu|\.in|\.com\.au)$/.test(uid);

const GET = withWideEvent(
  withAuth(async ({ userId }) => {
    const accounts = await database
      .select({
        accountId: calendarAccountsTable.id,
        email: calendarAccountsTable.email,
        needsReauthentication: calendarAccountsTable.needsReauthentication,
        oauthCredentialId: calendarAccountsTable.oauthCredentialId,
        providerMetadata: oauthCredentialsTable.providerMetadata,
      })
      .from(calendarAccountsTable)
      .leftJoin(
        oauthCredentialsTable,
        eq(calendarAccountsTable.oauthCredentialId, oauthCredentialsTable.id),
      )
      .where(
        and(
          eq(calendarAccountsTable.userId, userId),
          eq(calendarAccountsTable.provider, "zoho"),
        ),
      );

    const accountSummaries: AccountSummary[] = [];

    for (const account of accounts) {
      const calendars = await database
        .select({
          capabilities: calendarsTable.capabilities,
          externalCalendarId: calendarsTable.externalCalendarId,
          keeperCalendarId: calendarsTable.id,
          name: calendarsTable.name,
          syncToken: calendarsTable.syncToken,
        })
        .from(calendarsTable)
        .where(
          and(
            eq(calendarsTable.accountId, account.accountId),
            eq(calendarsTable.userId, userId),
          ),
        );

      const calendarIds = calendars.map((c) => c.keeperCalendarId);

      const events = calendarIds.length === 0
        ? []
        : await database
          .select({
            calendarId: eventStatesTable.calendarId,
            endTime: eventStatesTable.endTime,
            sourceEventUid: eventStatesTable.sourceEventUid,
            startTime: eventStatesTable.startTime,
            title: eventStatesTable.title,
          })
          .from(eventStatesTable)
          .where(inArray(eventStatesTable.calendarId, calendarIds));

      const calendarSummaries: CalendarSummary[] = calendars.map((cal) => {
        const calEvents = events.filter((e) => e.calendarId === cal.keeperCalendarId);
        return {
          capabilities: cal.capabilities,
          eventCount: calEvents.length,
          externalCalendarId: cal.externalCalendarId,
          keeperCalendarId: cal.keeperCalendarId,
          name: cal.name,
          sampleEvents: calEvents.slice(0, SAMPLE_EVENTS_PER_CALENDAR).map((e) => ({
            endTime: e.endTime,
            looksLikeZohoEventUid: e.sourceEventUid !== null && isZohoEventUid(e.sourceEventUid),
            sourceEventUid: e.sourceEventUid ?? "",
            startTime: e.startTime,
            title: e.title,
          })),
          syncToken: cal.syncToken,
        };
      });

      accountSummaries.push({
        accountId: account.accountId,
        calendars: calendarSummaries,
        email: account.email,
        needsReauthentication: account.needsReauthentication,
        oauthCredentialId: account.oauthCredentialId,
        providerMetadata: account.providerMetadata,
      });
    }

    return Response.json({
      accounts: accountSummaries,
      summary: {
        accountCount: accountSummaries.length,
        totalCalendars: accountSummaries.reduce((sum, a) => sum + a.calendars.length, 0),
        totalEvents: accountSummaries.reduce(
          (sum, a) => sum + a.calendars.reduce((s, c) => s + c.eventCount, 0),
          0,
        ),
      },
    });
  }),
);

export { GET };
