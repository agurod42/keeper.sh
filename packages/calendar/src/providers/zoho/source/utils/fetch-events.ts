import { zohoEventListResponseSchema } from "@keeper.sh/data-schemas";
import { isKeeperEvent } from "../../../../core/events/identity";
import { parseEventDateTime } from "../../shared/date-time";
import { isSimpleAuthError } from "../../shared/errors";
import type {
  EventTimeSlot,
  FetchEventsOptions,
  FetchEventsResult,
  ZohoCalendarEvent,
} from "../types";

class EventsFetchError extends Error {
  public readonly status: number;
  public readonly authRequired: boolean;

  constructor(
    message: string,
    status: number,
    authRequired = false,
  ) {
    super(message);
    this.name = "EventsFetchError";
    this.status = status;
    this.authRequired = authRequired;
  }
}

const REQUEST_TIMEOUT_MS = 30_000;

const isRequestTimeoutError = (error: unknown): boolean =>
  error instanceof Error
  && (error.name === "AbortError" || error.name === "TimeoutError");

const buildAuthHeaders = (accessToken: string): Record<string, string> => ({
  Authorization: `Zoho-oauthtoken ${accessToken}`,
});

const buildEventsUrl = (calendarApiBase: string, externalCalendarId: string): string => {
  const encodedCalendarId = encodeURIComponent(externalCalendarId);
  return `${calendarApiBase}/calendars/${encodedCalendarId}/events`;
};

/**
 * Fetches all events for a Zoho calendar. Zoho's `/events` endpoint does not
 * accept range params (validated empirically 2026-05-13) — it always returns
 * the full set. Range filtering is the caller's responsibility.
 */
const fetchCalendarEvents = async (options: FetchEventsOptions): Promise<FetchEventsResult> => {
  const { accessToken, calendarApiBase, externalCalendarId } = options;

  const url = buildEventsUrl(calendarApiBase, externalCalendarId);

  const response = await fetch(url, {
    headers: buildAuthHeaders(accessToken),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  }).catch((error) => {
    if (isRequestTimeoutError(error)) {
      throw new EventsFetchError(
        `Failed to fetch events: timeout after ${REQUEST_TIMEOUT_MS}ms`,
        408,
        false,
      );
    }
    throw error;
  });

  if (!response.ok) {
    const authRequired = isSimpleAuthError(response.status);
    throw new EventsFetchError(
      `Failed to fetch events: ${response.status}`,
      response.status,
      authRequired,
    );
  }

  const responseBody = await response.json();
  const data = zohoEventListResponseSchema.assert(responseBody);
  return {
    events: (data.events ?? []) as ZohoCalendarEvent[],
    fullSyncRequired: false,
  };
};

interface FetchCalendarNameOptions {
  accessToken: string;
  calendarApiBase: string;
  externalCalendarId: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const parseCalendarName = (value: unknown): string | null => {
  if (!isRecord(value)) {
    return null;
  }

  const candidate = isRecord(value.calendar) ? value.calendar.name : value.name;
  if (typeof candidate !== "string") {
    return null;
  }
  const trimmed = candidate.trim();
  if (trimmed.length === 0) {
    return null;
  }
  return trimmed;
};

const fetchCalendarName = async (options: FetchCalendarNameOptions): Promise<string | null> => {
  const { accessToken, calendarApiBase, externalCalendarId } = options;
  const encodedCalendarId = encodeURIComponent(externalCalendarId);
  const url = `${calendarApiBase}/calendars/${encodedCalendarId}`;

  const response = await fetch(url, {
    headers: buildAuthHeaders(accessToken),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  }).catch((error) => {
    if (isRequestTimeoutError(error)) {
      throw new EventsFetchError(
        `Failed to fetch calendar metadata: timeout after ${REQUEST_TIMEOUT_MS}ms`,
        408,
        false,
      );
    }
    throw error;
  });

  if (!response.ok) {
    const authRequired = isSimpleAuthError(response.status);
    throw new EventsFetchError(
      `Failed to fetch calendar metadata: ${response.status}`,
      response.status,
      authRequired,
    );
  }

  const responseBody = await response.json();
  return parseCalendarName(responseBody);
};

/**
 * Zoho's free/busy is encoded in `estatus`. There's no direct mapping to
 * Outlook's `showAs` taxonomy — only "free"/"busy" are inferable. Other
 * values fall through to undefined.
 */
const parseAvailability = (value: string | undefined): EventTimeSlot["availability"] | null => {
  if (!value) {
    return null;
  }
  const normalized = value.toLowerCase();
  if (normalized === "free") {
    return "free";
  }
  if (normalized === "busy" || normalized === "tentative") {
    return "busy";
  }
  return null;
};

const parseZohoEvents = (events: ZohoCalendarEvent[]): EventTimeSlot[] => {
  const result: EventTimeSlot[] = [];

  for (const event of events) {
    const dateandtime = event.dateandtime;
    if (!dateandtime) {
      continue;
    }

    const startTime = parseEventDateTime(dateandtime, "start");
    const endTime = parseEventDateTime(dateandtime, "end");

    if (!startTime || !endTime) {
      continue;
    }

    const uid = event.caluid ?? event.uid;
    if (!uid) {
      continue;
    }

    if (isKeeperEvent(uid)) {
      continue;
    }

    const availability = parseAvailability(event.estatus);

    result.push({
      ...availability && { availability },
      description: event.description,
      endTime,
      isAllDay: event.isallday ?? false,
      location: event.location,
      startTime,
      ...dateandtime.timezone && { startTimeZone: dateandtime.timezone },
      title: event.title,
      uid,
    });
  }

  return result;
};

export {
  fetchCalendarEvents,
  fetchCalendarName,
  parseZohoEvents,
  EventsFetchError,
};
