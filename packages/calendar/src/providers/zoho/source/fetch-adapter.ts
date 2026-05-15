import { getOAuthSyncWindow } from "../../../core/oauth/sync-window";
import { getCalendarApiBaseFromMetadata } from "../../../core/oauth/zoho";
import type { ZohoProviderMetadata } from "../../../core/oauth/zoho";
import type { FetchEventsResult } from "../../../core/sync-engine/ingest";
import { fetchCalendarEvents, parseZohoEvents } from "./utils/fetch-events";

const YEARS_UNTIL_FUTURE = 2;

interface ZohoSourceFetcherConfig {
  accessToken: string;
  externalCalendarId: string;
  providerMetadata: ZohoProviderMetadata;
}

interface ZohoSourceFetcher {
  fetchEvents: () => Promise<FetchEventsResult>;
}

const isWithinWindow = (
  startTime: Date,
  endTime: Date,
  syncWindow: { timeMin: Date; timeMax: Date },
): boolean => endTime >= syncWindow.timeMin && startTime <= syncWindow.timeMax;

/**
 * Zoho doesn't support range params on `/events`, so we always full-sync and
 * filter client-side. The fetcher therefore always returns
 * `isDeltaSync: false` and never sets `nextSyncToken`.
 */
const createZohoSourceFetcher = (config: ZohoSourceFetcherConfig): ZohoSourceFetcher => {
  const fetchEvents = async (): Promise<FetchEventsResult> => {
    const calendarApiBase = getCalendarApiBaseFromMetadata(config.providerMetadata);
    const result = await fetchCalendarEvents({
      accessToken: config.accessToken,
      calendarApiBase,
      externalCalendarId: config.externalCalendarId,
    });

    const syncWindow = getOAuthSyncWindow(YEARS_UNTIL_FUTURE);
    const parsed = parseZohoEvents(result.events);
    const filtered = parsed.filter((event) => isWithinWindow(event.startTime, event.endTime, syncWindow));

    return {
      events: filtered,
      isDeltaSync: false,
    };
  };

  return { fetchEvents };
};

export { createZohoSourceFetcher };
export type { ZohoSourceFetcherConfig, ZohoSourceFetcher };
