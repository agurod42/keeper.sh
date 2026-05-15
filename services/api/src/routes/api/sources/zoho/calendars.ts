import { listUserCalendars, CalendarListError } from "@keeper.sh/calendar/zoho";
import {
  buildZohoProviderMetadata,
  getZohoRegionFromMetadata,
} from "@keeper.sh/calendar";
import { oauthCredentialsTable, calendarAccountsTable } from "@keeper.sh/database/schema";
import { and, eq } from "drizzle-orm";
import { withAuth, withWideEvent } from "@/utils/middleware";
import { widelog } from "@/utils/logging";
import { listOAuthCalendars } from "@/utils/oauth-calendar-listing";
import {
  refreshZohoAccessToken,
  refreshZohoSourceAccessToken,
} from "@/utils/oauth-refresh";
import { database } from "@/context";

const ZOHO_PROVIDER = "zoho";
const FIRST_RESULT_LIMIT = 1;

const resolveZohoProviderMetadataForCredentialId = async (
  credentialId: string,
): Promise<unknown> => {
  const [credential] = await database
    .select({ providerMetadata: oauthCredentialsTable.providerMetadata })
    .from(oauthCredentialsTable)
    .where(eq(oauthCredentialsTable.id, credentialId))
    .limit(FIRST_RESULT_LIMIT);
  return credential?.providerMetadata ?? null;
};

const resolveZohoProviderMetadataForAccountId = async (
  accountId: string,
): Promise<unknown> => {
  const [row] = await database
    .select({ providerMetadata: oauthCredentialsTable.providerMetadata })
    .from(calendarAccountsTable)
    .innerJoin(
      oauthCredentialsTable,
      eq(calendarAccountsTable.oauthCredentialId, oauthCredentialsTable.id),
    )
    .where(
      and(
        eq(calendarAccountsTable.id, accountId),
        eq(calendarAccountsTable.provider, ZOHO_PROVIDER),
      ),
    )
    .limit(FIRST_RESULT_LIMIT);
  return row?.providerMetadata ?? null;
};

const GET = withWideEvent(
  withAuth(async ({ request, userId }) => {
    widelog.set("provider.name", "zoho");

    const url = new URL(request.url);
    const credentialId = url.searchParams.get("credentialId");
    const destinationId = url.searchParams.get("destinationId");

    let rawMetadata: unknown = null;
    if (credentialId) {
      rawMetadata = await resolveZohoProviderMetadataForCredentialId(credentialId);
    } else if (destinationId) {
      rawMetadata = await resolveZohoProviderMetadataForAccountId(destinationId);
    }

    const region = getZohoRegionFromMetadata(rawMetadata);
    const providerMetadata = buildZohoProviderMetadata(region);

    return listOAuthCalendars(request, userId, {
      isCalendarListError: (error): error is CalendarListError =>
        error instanceof CalendarListError,
      listCalendars: async (accessToken) => {
        const calendars = await listUserCalendars(accessToken, { providerMetadata });
        return calendars.map((calendar) => ({
          id: calendar.uid,
          primary: Boolean(calendar.isdefault ?? calendar.default),
          summary: calendar.name ?? calendar.uid,
        }));
      },
      provider: ZOHO_PROVIDER,
      refreshDestinationAccessToken: refreshZohoAccessToken,
      refreshSourceAccessToken: refreshZohoSourceAccessToken,
    });
  }),
);

export { GET };
