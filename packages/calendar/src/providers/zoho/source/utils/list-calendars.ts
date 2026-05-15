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

/**
 * Fetches all calendars the user has access to — both personal (`category: "own"`)
 * and group calendars (`category: "group"` — calendars shared with the user via
 * Zoho Workplace groups/orgs).
 *
 * The Zoho `/api/v1/groups` endpoint returns *contact groups* from Zoho People
 * (not calendars), so it's NOT useful for calendar discovery — see
 * `Operations/Zoho Calendar API - notes.md` for the empirical findings.
 *
 * The `category=all` query brings back own + group + app + others in a single
 * request with a consistent shape. Stubs (groups that were never given a real
 * calendar — `uid: "group_<numeric>"`, `ctag: 0`) are returned as-is and the
 * caller can choose to filter them.
 */
const fetchAllCalendars = async (
  accessToken: string,
  calendarApiBase: string,
): Promise<ZohoCalendarListEntry[]> => {
  const url = `${calendarApiBase}/calendars?category=all`;

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

interface ListUserCalendarsOptions {
  providerMetadata: ZohoProviderMetadata;
}

const listUserCalendars = async (
  accessToken: string,
  options: ListUserCalendarsOptions,
): Promise<ZohoCalendarListEntry[]> => {
  const calendarApiBase = getCalendarApiBaseFromMetadata(options.providerMetadata);
  return fetchAllCalendars(accessToken, calendarApiBase);
};

export { listUserCalendars, CalendarListError };
export type { ListUserCalendarsOptions };
