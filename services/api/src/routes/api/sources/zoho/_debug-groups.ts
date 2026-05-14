/**
 * TEMPORARY DEV endpoint: surfaces the raw response of Zoho discovery
 * endpoints, and — once /groups returns 200 with `entityid: "pgroup-..."` —
 * probes whether that entityid can be used directly as a calendar uid via
 * `/calendars/<entityid>` and `/calendars/<entityid>/events`.
 *
 * Auth-protected; user-scoped (only sees its own credential). Removed once
 * Task #22 has resolved the group-calendars implementation.
 */
import { oauthCredentialsTable } from "@keeper.sh/database/schema";
import { and, eq } from "drizzle-orm";
import { getZohoCalendarApiBase } from "@keeper.sh/calendar";
import { withAuth, withWideEvent } from "@/utils/middleware";
import { ErrorResponse } from "@/utils/responses";
import { database } from "@/context";

const FIRST_RESULT_LIMIT = 1;
const BODY_TRUNCATE = 1500;
const STATIC_ENDPOINTS = [
  "/groups",
  "/calendars",
  "/calendars?category=group",
  "/calendars?category=app",
  "/calendars?category=others",
  "/calendars?category=all",
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
    // not JSON
  }
  return { bodyJson, bodyText: bodyText.slice(0, BODY_TRUNCATE), path, status: response.status };
};

const extractGroupEntityIds = (bodyJson: unknown): string[] => {
  if (!bodyJson || typeof bodyJson !== "object" || !("groups" in bodyJson)) {
    return [];
  }
  const groups = (bodyJson as { groups: unknown }).groups;
  if (!Array.isArray(groups)) {
    return [];
  }
  const ids: string[] = [];
  for (const g of groups) {
    if (g && typeof g === "object" && "entityid" in g) {
      const id = (g as { entityid: unknown }).entityid;
      if (typeof id === "string") {
        ids.push(id);
      }
    }
  }
  return ids;
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

    // Static endpoints first
    const staticResults = await Promise.all(
      STATIC_ENDPOINTS.map((path) =>
        probe(calendarApiBase, credential.accessToken, path).catch((error: unknown) => ({
          bodyJson: null,
          bodyText: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
          path,
          status: -1,
        })),
      ),
    );

    // Use entityids from /groups to probe candidate calendar endpoints
    const groupsResponse = staticResults.find((r) => r.path === "/groups");
    const groupEntityIds = groupsResponse ? extractGroupEntityIds(groupsResponse.bodyJson) : [];

    const perGroupResults: ProbeResult[] = [];
    for (const entityId of groupEntityIds) {
      // probe the calendar metadata + a tiny events fetch for each group
      const calendarPath = `/calendars/${encodeURIComponent(entityId)}`;
      const eventsPath = `/calendars/${encodeURIComponent(entityId)}/events`;
      perGroupResults.push(
        await probe(calendarApiBase, credential.accessToken, calendarPath).catch((error: unknown) => ({
          bodyJson: null,
          bodyText: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
          path: calendarPath,
          status: -1,
        })),
      );
      perGroupResults.push(
        await probe(calendarApiBase, credential.accessToken, eventsPath).catch((error: unknown) => ({
          bodyJson: null,
          bodyText: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
          path: eventsPath,
          status: -1,
        })),
      );
    }

    return Response.json({ calendarApiBase, groupEntityIds, perGroupResults, staticResults });
  }),
);

export { GET };
