import { zohoCalendarListResponseSchema } from "@keeper.sh/data-schemas";
import type { ZohoCalendarListEntry } from "../types";
import type { ZohoProviderMetadata } from "../../../../core/oauth/zoho";
import { getCalendarApiBaseFromMetadata } from "../../../../core/oauth/zoho";
import { isSimpleAuthError } from "../../shared/errors";

const INVALID_RESPONSE_STATUS = 502;

class CalendarListError extends Error {
  public readonly status: number;
  public readonly authRequired: boolean;

  constructor(
    message: string,
    status: number,
    authRequired = false,
  ) {
    super(message);
    this.name = "CalendarListError";
    this.status = status;
    this.authRequired = authRequired;
  }
}

const buildAuthHeaders = (accessToken: string): Record<string, string> => ({
  Authorization: `Zoho-oauthtoken ${accessToken}`,
});

const fetchPersonalCalendars = async (
  accessToken: string,
  calendarApiBase: string,
): Promise<ZohoCalendarListEntry[]> => {
  const url = `${calendarApiBase}/calendars`;

  const response = await fetch(url, {
    headers: buildAuthHeaders(accessToken),
  });

  if (!response.ok) {
    const authRequired = isSimpleAuthError(response.status);
    throw new CalendarListError(
      `Failed to list calendars: ${response.status}`,
      response.status,
      authRequired,
    );
  }

  const responseBody = await response.json();
  let parsed;
  try {
    parsed = zohoCalendarListResponseSchema.assert(responseBody);
  } catch {
    throw new CalendarListError(
      "Invalid calendar list response",
      INVALID_RESPONSE_STATUS,
    );
  }
  return (parsed.calendars ?? []) as ZohoCalendarListEntry[];
};

/**
 * Group calendars are deferred. Zoho's `/groups` endpoint requires the
 * `ZohoCalendar.group.READ` scope, and even when granted may 403 depending
 * on workspace plan. We try it best-effort and swallow failures silently —
 * the API spec says "the fallback paste-UID form" handles group calendars
 * out-of-band when this returns nothing.
 */
const fetchGroupCalendars = async (
  accessToken: string,
  calendarApiBase: string,
): Promise<ZohoCalendarListEntry[]> => {
  try {
    const url = `${calendarApiBase}/groups`;
    const response = await fetch(url, {
      headers: buildAuthHeaders(accessToken),
    });

    if (!response.ok) {
      return [];
    }

    const responseBody = await response.json();
    let parsed;
    try {
      parsed = zohoCalendarListResponseSchema.assert(responseBody);
    } catch {
      return [];
    }
    return (parsed.calendars ?? []) as ZohoCalendarListEntry[];
  } catch {
    return [];
  }
};

interface ListUserCalendarsOptions {
  providerMetadata: ZohoProviderMetadata;
}

const listUserCalendars = async (
  accessToken: string,
  options: ListUserCalendarsOptions,
): Promise<ZohoCalendarListEntry[]> => {
  const calendarApiBase = getCalendarApiBaseFromMetadata(options.providerMetadata);
  const personal = await fetchPersonalCalendars(accessToken, calendarApiBase);
  const groups = await fetchGroupCalendars(accessToken, calendarApiBase);
  return [...personal, ...groups];
};

export { listUserCalendars, CalendarListError };
export type { ListUserCalendarsOptions };
