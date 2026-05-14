import { HTTP_STATUS } from "@keeper.sh/constants";
import {
  zohoApiErrorSchema,
  zohoEventListResponseSchema,
  zohoEventSchema,
} from "@keeper.sh/data-schemas";

import type { DeleteResult, PushResult, RemoteEvent, SyncableEvent } from "../../../core/types";
import { getErrorMessage } from "../../../core/utils/error";
import { getOAuthSyncWindowStart } from "../../../core/oauth/sync-window";
import { ensureValidToken } from "../../../core/oauth/ensure-valid-token";
import type { TokenRefresher, TokenState } from "../../../core/oauth/ensure-valid-token";
import { getCalendarApiBaseFromMetadata } from "../../../core/oauth/zoho";
import type { ZohoProviderMetadata } from "../../../core/oauth/zoho";
import { isKeeperEvent } from "../../../core/events/identity";

import { PRECONDITION_FAILED_STATUS } from "../shared/api";
import { parseEventTime } from "../shared/date-time";
import { serializeZohoEvent } from "./serialize-event";

interface ZohoSyncProviderConfig {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  externalCalendarId: string;
  calendarId: string;
  userId: string;
  providerMetadata: ZohoProviderMetadata;
  refreshAccessToken?: TokenRefresher;
}

const ETAG_RETRY_LIMIT = 1;

const buildAuthHeaders = (accessToken: string): Record<string, string> => ({
  Authorization: `Zoho-oauthtoken ${accessToken}`,
});

const buildFormBody = (eventDataJson: string): URLSearchParams => {
  const params = new URLSearchParams();
  params.set("eventdata", eventDataJson);
  return params;
};

const parseErrorMessage = async (response: Response, fallback: string): Promise<string> => {
  try {
    const body = await response.json();
    const parsed = zohoApiErrorSchema.assert(body);
    return parsed.message ?? fallback;
  } catch {
    return fallback;
  }
};

const normalizeEtag = (etag: string | number | undefined): string | null => {
  if (etag === undefined || etag === null) {
    return null;
  }
  return String(etag);
};

const createZohoSyncProvider = (config: ZohoSyncProviderConfig) => {
  const tokenState: TokenState = {
    accessToken: config.accessToken,
    accessTokenExpiresAt: config.accessTokenExpiresAt,
    refreshToken: config.refreshToken,
  };

  const calendarApiBase = getCalendarApiBaseFromMetadata(config.providerMetadata);
  const encodedCalendarId = encodeURIComponent(config.externalCalendarId);
  const calendarBaseUrl = `${calendarApiBase}/calendars/${encodedCalendarId}`;
  const eventsUrl = `${calendarBaseUrl}/events`;

  const refreshIfNeeded = async (): Promise<void> => {
    if (config.refreshAccessToken) {
      await ensureValidToken(tokenState, config.refreshAccessToken);
    }
  };

  /**
   * Fetches the current etag for a remote event. Required before any PUT or
   * DELETE — Zoho rejects mutations without a matching `etag` header.
   *
   * Returns `null` when the event no longer exists (404), so callers can
   * treat deletes as already-completed instead of failing.
   */
  const fetchEventEtag = async (eventUid: string): Promise<string | null> => {
    const url = `${eventsUrl}/${encodeURIComponent(eventUid)}`;
    const response = await fetch(url, {
      headers: buildAuthHeaders(tokenState.accessToken),
      method: "GET",
    });

    if (response.status === HTTP_STATUS.NOT_FOUND) {
      await response.body?.cancel?.();
      return null;
    }

    if (!response.ok) {
      const message = await parseErrorMessage(response, response.statusText);
      throw new Error(`Failed to fetch event etag: ${response.status} ${message}`);
    }

    const body = await response.json();
    const event = zohoEventSchema.assert(body);
    return normalizeEtag(event.etag);
  };

  const pushEvents = async (events: SyncableEvent[]): Promise<PushResult[]> => {
    await refreshIfNeeded();
    const results: PushResult[] = [];

    for (const event of events) {
      try {
        const eventDataJson = serializeZohoEvent(event);
        const response = await fetch(eventsUrl, {
          body: buildFormBody(eventDataJson),
          headers: {
            ...buildAuthHeaders(tokenState.accessToken),
            "Content-Type": "application/x-www-form-urlencoded",
          },
          method: "POST",
        });

        if (!response.ok) {
          const message = await parseErrorMessage(response, response.statusText);
          results.push({ error: message, success: false });
          continue;
        }

        const body = await response.json();
        let createdUid: string | undefined;
        let createdEtag: string | undefined;

        try {
          const parsed = zohoEventListResponseSchema.assert(body);
          const first = parsed.events?.[0];
          if (first) {
            createdUid = first.caluid ?? first.uid;
            if (first.etag !== undefined) {
              createdEtag = String(first.etag);
            }
          }
        } catch {
          try {
            const single = zohoEventSchema.assert(body);
            createdUid = single.caluid ?? single.uid;
            if (single.etag !== undefined) {
              createdEtag = String(single.etag);
            }
          } catch {
            // Body did not match either schema — fall through and emit a generic failure below.
          }
        }

        if (!createdUid) {
          results.push({ error: "Zoho did not return a UID for created event", success: false });
          continue;
        }

        results.push({
          deleteId: createdUid,
          remoteId: createdUid,
          success: true,
          ...(createdEtag && { conflictResolved: false }),
        });
      } catch (error) {
        results.push({ error: getErrorMessage(error), success: false });
      }
    }

    return results;
  };

  /**
   * Deletes an event with one retry on stale-etag (412). Implements the
   * GET-then-mutate pattern Zoho requires for concurrency safety.
   */
  const deleteEventWithEtagRetry = async (eventUid: string): Promise<DeleteResult> => {
    for (let attempt = 0; attempt <= ETAG_RETRY_LIMIT; attempt++) {
      const etag = await fetchEventEtag(eventUid);
      if (etag === null) {
        return { success: true };
      }

      const url = `${eventsUrl}/${encodeURIComponent(eventUid)}`;
      const response = await fetch(url, {
        headers: {
          ...buildAuthHeaders(tokenState.accessToken),
          etag,
        },
        method: "DELETE",
      });

      if (response.ok || response.status === HTTP_STATUS.NOT_FOUND) {
        await response.body?.cancel?.();
        return { success: true };
      }

      if (response.status === PRECONDITION_FAILED_STATUS && attempt < ETAG_RETRY_LIMIT) {
        await response.body?.cancel?.();
        continue;
      }

      const message = await parseErrorMessage(response, response.statusText);
      return { error: message, success: false };
    }

    return { error: "Etag retry exhausted on delete", success: false };
  };

  const deleteEvents = async (eventIds: string[]): Promise<DeleteResult[]> => {
    await refreshIfNeeded();
    const results: DeleteResult[] = [];

    for (const eventId of eventIds) {
      try {
        const result = await deleteEventWithEtagRetry(eventId);
        results.push(result);
      } catch (error) {
        results.push({ error: getErrorMessage(error), success: false });
      }
    }

    return results;
  };

  const listRemoteEvents = async (): Promise<RemoteEvent[]> => {
    await refreshIfNeeded();
    const remoteEvents: RemoteEvent[] = [];

    const response = await fetch(eventsUrl, {
      headers: buildAuthHeaders(tokenState.accessToken),
      method: "GET",
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response, response.statusText);
      throw new Error(message);
    }

    const body = await response.json();
    const data = zohoEventListResponseSchema.assert(body);

    const lookbackStart = getOAuthSyncWindowStart();
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 2);

    for (const event of data.events ?? []) {
      const startTime = parseEventTime(event.dateandtime, "start");
      const endTime = parseEventTime(event.dateandtime, "end");

      const uid = event.caluid ?? event.uid;
      if (!uid || !startTime || !endTime) {
        continue;
      }

      if (endTime < lookbackStart || startTime > futureDate) {
        continue;
      }

      remoteEvents.push({
        deleteId: uid,
        endTime,
        isKeeperEvent: isKeeperEvent(uid),
        startTime,
        uid,
      });
    }

    return remoteEvents;
  };

  return { deleteEvents, listRemoteEvents, pushEvents };
};

export { createZohoSyncProvider };
export type { ZohoSyncProviderConfig };
