/**
 * TEMPORARY DEV endpoint to surface raw Zoho discovery responses.
 * Refreshes the access_token first if expired, so probes are reliable across
 * multiple hits.
 *
 * Removed once Task #22 has resolved the group-calendars implementation.
 */
import { oauthCredentialsTable } from "@keeper.sh/database/schema";
import { and, eq } from "drizzle-orm";
import {
  createZohoTokenRefresher,
  getZohoCalendarApiBase,
  getZohoRegionFromMetadata,
} from "@keeper.sh/calendar";
import { withAuth, withWideEvent } from "@/utils/middleware";
import { ErrorResponse } from "@/utils/responses";
import { database, env } from "@/context";

const FIRST_RESULT_LIMIT = 1;
const MS_PER_SECOND = 1000;
const BODY_TRUNCATE = 1500;
const REFRESH_BUFFER_MS = 60_000; // refresh if token expires within next minute

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

const ensureFreshToken = async (
  credentialId: string,
  current: { accessToken: string; refreshToken: string; expiresAt: Date; providerMetadata: unknown },
): Promise<string> => {
  const expiresInMs = current.expiresAt.getTime() - Date.now();
  if (expiresInMs > REFRESH_BUFFER_MS) {
    return current.accessToken;
  }
  if (!env.ZOHO_CLIENT_ID || !env.ZOHO_CLIENT_SECRET) {
    throw new Error("Zoho OAuth not configured");
  }

  const region = getZohoRegionFromMetadata(current.providerMetadata);
  const refresh = createZohoTokenRefresher({
    clientId: env.ZOHO_CLIENT_ID,
    clientSecret: env.ZOHO_CLIENT_SECRET,
  });
  const tokens = await refresh(current.refreshToken, { region });
  const newExpiresAt = new Date(Date.now() + tokens.expires_in * MS_PER_SECOND);

  await database
    .update(oauthCredentialsTable)
    .set({
      accessToken: tokens.access_token,
      expiresAt: newExpiresAt,
      refreshToken: tokens.refresh_token ?? current.refreshToken,
    })
    .where(eq(oauthCredentialsTable.id, credentialId));

  return tokens.access_token;
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
        expiresAt: oauthCredentialsTable.expiresAt,
        id: oauthCredentialsTable.id,
        providerMetadata: oauthCredentialsTable.providerMetadata,
        refreshToken: oauthCredentialsTable.refreshToken,
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

    const accessToken = await ensureFreshToken(credential.id, {
      accessToken: credential.accessToken,
      expiresAt: credential.expiresAt,
      providerMetadata: credential.providerMetadata,
      refreshToken: credential.refreshToken,
    });

    const calendarApiBase = getZohoCalendarApiBase(credential.providerMetadata);

    const staticResults = await Promise.all(
      STATIC_ENDPOINTS.map((path) =>
        probe(calendarApiBase, accessToken, path).catch((error: unknown) => ({
          bodyJson: null,
          bodyText: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
          path,
          status: -1,
        })),
      ),
    );

    const groupsResponse = staticResults.find((r) => r.path === "/groups");
    const groupEntityIds = groupsResponse ? extractGroupEntityIds(groupsResponse.bodyJson) : [];

    const perGroupResults: ProbeResult[] = [];
    for (const entityId of groupEntityIds) {
      const calendarPath = `/calendars/${encodeURIComponent(entityId)}`;
      const eventsPath = `/calendars/${encodeURIComponent(entityId)}/events`;
      perGroupResults.push(
        await probe(calendarApiBase, accessToken, calendarPath).catch((error: unknown) => ({
          bodyJson: null,
          bodyText: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
          path: calendarPath,
          status: -1,
        })),
      );
      perGroupResults.push(
        await probe(calendarApiBase, accessToken, eventsPath).catch((error: unknown) => ({
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
