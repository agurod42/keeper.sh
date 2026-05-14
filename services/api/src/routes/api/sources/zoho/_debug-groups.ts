/**
 * TEMPORARY DEV endpoint: surfaces the raw response of several Zoho endpoints
 * that may expose group/shared calendars, so we can decide implementation
 * strategy without poking the live token in the DB by hand.
 *
 * Auth-protected (same withAuth middleware as the rest of /api/sources/*).
 * Returns the first Zoho oauth_credentials row of the requesting user.
 *
 * Removed once Task #22 has resolved the group-calendars approach.
 */
import { oauthCredentialsTable } from "@keeper.sh/database/schema";
import { and, eq } from "drizzle-orm";
import { getZohoCalendarApiBase } from "@keeper.sh/calendar";
import { withAuth, withWideEvent } from "@/utils/middleware";
import { ErrorResponse } from "@/utils/responses";
import { database } from "@/context";

const FIRST_RESULT_LIMIT = 1;
const ENDPOINTS_TO_PROBE = [
  "/groups",
  "/groupcalendars",
  "/sharedcalendars",
  "/calendar/groups",
  "/calendars?type=group",
  "/calendars?ownerType=group",
  "/calendars?includeGroups=true",
  // baseline — must work, sanity check
  "/calendars",
] as const;

interface ProbeResult {
  path: string;
  status: number;
  bodyText: string;
  bodyJson: unknown;
}

const probe = async (
  calendarApiBase: string,
  accessToken: string,
  path: string,
): Promise<ProbeResult> => {
  const url = `${calendarApiBase}${path}`;
  const response = await fetch(url, {
    headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
  });
  const bodyText = await response.text();
  let bodyJson: unknown = null;
  try {
    bodyJson = JSON.parse(bodyText);
  } catch {
    // not JSON — keep null
  }
  return { bodyJson, bodyText: bodyText.slice(0, 1500), path, status: response.status };
};

const GET = withWideEvent(
  withAuth(async ({ userId }) => {
    const [credential] = await database
      .select({
        accessToken: oauthCredentialsTable.accessToken,
        providerMetadata: oauthCredentialsTable.providerMetadata,
      })
      .from(oauthCredentialsTable)
      .where(
        and(
          eq(oauthCredentialsTable.userId, userId),
          eq(oauthCredentialsTable.provider, "zoho"),
        ),
      )
      .limit(FIRST_RESULT_LIMIT);

    if (!credential) {
      return ErrorResponse.notFound("No Zoho credential found for user").toResponse();
    }

    const calendarApiBase = getZohoCalendarApiBase(credential.providerMetadata);

    const results = await Promise.all(
      ENDPOINTS_TO_PROBE.map((path) =>
        probe(calendarApiBase, credential.accessToken, path).catch((error: unknown) => ({
          bodyJson: null,
          bodyText: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
          path,
          status: -1,
        })),
      ),
    );

    return Response.json({ calendarApiBase, results });
  }),
);

export { GET };
