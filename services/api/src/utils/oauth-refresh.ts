import {
  calendarAccountsTable,
  oauthCredentialsTable,
} from "@keeper.sh/database/schema";
import { createGoogleTokenRefresher } from "@keeper.sh/calendar";
import { createMicrosoftTokenRefresher } from "@keeper.sh/calendar";
import {
  createZohoTokenRefresher,
  getZohoRegionFromMetadata,
} from "@keeper.sh/calendar";
import { eq } from "drizzle-orm";
import { database, env } from "@/context";

const FIRST_RESULT_LIMIT = 1;
const MS_PER_SECOND = 1000;

interface RefreshResult {
  accessToken: string;
  expiresAt: Date;
}

const refreshGoogleAccessToken = async (
  accountId: string,
  refreshToken: string,
): Promise<RefreshResult> => {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new Error("Google OAuth not configured");
  }

  const refreshGoogleToken = createGoogleTokenRefresher({
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
  });

  const tokenData = await refreshGoogleToken(refreshToken);
  const newExpiresAt = new Date(Date.now() + tokenData.expires_in * MS_PER_SECOND);

  const [account] = await database
    .select({ oauthCredentialId: calendarAccountsTable.oauthCredentialId })
    .from(calendarAccountsTable)
    .where(eq(calendarAccountsTable.id, accountId))
    .limit(FIRST_RESULT_LIMIT);

  if (account?.oauthCredentialId) {
    await database
      .update(oauthCredentialsTable)
      .set({
        accessToken: tokenData.access_token,
        expiresAt: newExpiresAt,
        refreshToken: tokenData.refresh_token ?? refreshToken,
      })
      .where(eq(oauthCredentialsTable.id, account.oauthCredentialId));
  }

  return {
    accessToken: tokenData.access_token,
    expiresAt: newExpiresAt,
  };
};

const refreshMicrosoftAccessToken = async (
  accountId: string,
  refreshToken: string,
): Promise<RefreshResult> => {
  if (!env.MICROSOFT_CLIENT_ID || !env.MICROSOFT_CLIENT_SECRET) {
    throw new Error("Microsoft OAuth not configured");
  }

  const refreshMicrosoftToken = createMicrosoftTokenRefresher({
    clientId: env.MICROSOFT_CLIENT_ID,
    clientSecret: env.MICROSOFT_CLIENT_SECRET,
  });

  const tokenData = await refreshMicrosoftToken(refreshToken);
  const newExpiresAt = new Date(Date.now() + tokenData.expires_in * MS_PER_SECOND);

  const [account] = await database
    .select({ oauthCredentialId: calendarAccountsTable.oauthCredentialId })
    .from(calendarAccountsTable)
    .where(eq(calendarAccountsTable.id, accountId))
    .limit(FIRST_RESULT_LIMIT);

  if (account?.oauthCredentialId) {
    await database
      .update(oauthCredentialsTable)
      .set({
        accessToken: tokenData.access_token,
        expiresAt: newExpiresAt,
        refreshToken: tokenData.refresh_token ?? refreshToken,
      })
      .where(eq(oauthCredentialsTable.id, account.oauthCredentialId));
  }

  return {
    accessToken: tokenData.access_token,
    expiresAt: newExpiresAt,
  };
};

const refreshGoogleSourceAccessToken = async (
  credentialId: string,
  refreshToken: string,
): Promise<RefreshResult> => {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new Error("Google OAuth not configured");
  }

  const refreshGoogleToken = createGoogleTokenRefresher({
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
  });

  const tokenData = await refreshGoogleToken(refreshToken);
  const newExpiresAt = new Date(Date.now() + tokenData.expires_in * MS_PER_SECOND);

  await database
    .update(oauthCredentialsTable)
    .set({
      accessToken: tokenData.access_token,
      expiresAt: newExpiresAt,
      refreshToken: tokenData.refresh_token ?? refreshToken,
    })
    .where(eq(oauthCredentialsTable.id, credentialId));

  return {
    accessToken: tokenData.access_token,
    expiresAt: newExpiresAt,
  };
};

const refreshMicrosoftSourceAccessToken = async (
  credentialId: string,
  refreshToken: string,
): Promise<RefreshResult> => {
  if (!env.MICROSOFT_CLIENT_ID || !env.MICROSOFT_CLIENT_SECRET) {
    throw new Error("Microsoft OAuth not configured");
  }

  const refreshMicrosoftToken = createMicrosoftTokenRefresher({
    clientId: env.MICROSOFT_CLIENT_ID,
    clientSecret: env.MICROSOFT_CLIENT_SECRET,
  });

  const tokenData = await refreshMicrosoftToken(refreshToken);
  const newExpiresAt = new Date(Date.now() + tokenData.expires_in * MS_PER_SECOND);

  await database
    .update(oauthCredentialsTable)
    .set({
      accessToken: tokenData.access_token,
      expiresAt: newExpiresAt,
      refreshToken: tokenData.refresh_token ?? refreshToken,
    })
    .where(eq(oauthCredentialsTable.id, credentialId));

  return {
    accessToken: tokenData.access_token,
    expiresAt: newExpiresAt,
  };
};

const refreshZohoAccessToken = async (
  accountId: string,
  refreshToken: string,
): Promise<RefreshResult> => {
  if (!env.ZOHO_CLIENT_ID || !env.ZOHO_CLIENT_SECRET) {
    throw new Error("Zoho OAuth not configured");
  }

  const [account] = await database
    .select({
      oauthCredentialId: calendarAccountsTable.oauthCredentialId,
    })
    .from(calendarAccountsTable)
    .where(eq(calendarAccountsTable.id, accountId))
    .limit(FIRST_RESULT_LIMIT);

  if (!account?.oauthCredentialId) {
    throw new Error("OAuth credential not found for account");
  }

  const [credential] = await database
    .select({ providerMetadata: oauthCredentialsTable.providerMetadata })
    .from(oauthCredentialsTable)
    .where(eq(oauthCredentialsTable.id, account.oauthCredentialId))
    .limit(FIRST_RESULT_LIMIT);

  const region = getZohoRegionFromMetadata(credential?.providerMetadata ?? null);

  const refreshZohoToken = createZohoTokenRefresher({
    clientId: env.ZOHO_CLIENT_ID,
    clientSecret: env.ZOHO_CLIENT_SECRET,
  });

  const tokenData = await refreshZohoToken(refreshToken, { region });
  const newExpiresAt = new Date(Date.now() + tokenData.expires_in * MS_PER_SECOND);

  await database
    .update(oauthCredentialsTable)
    .set({
      accessToken: tokenData.access_token,
      expiresAt: newExpiresAt,
      refreshToken: tokenData.refresh_token ?? refreshToken,
    })
    .where(eq(oauthCredentialsTable.id, account.oauthCredentialId));

  return {
    accessToken: tokenData.access_token,
    expiresAt: newExpiresAt,
  };
};

const refreshZohoSourceAccessToken = async (
  credentialId: string,
  refreshToken: string,
): Promise<RefreshResult> => {
  if (!env.ZOHO_CLIENT_ID || !env.ZOHO_CLIENT_SECRET) {
    throw new Error("Zoho OAuth not configured");
  }

  const [credential] = await database
    .select({ providerMetadata: oauthCredentialsTable.providerMetadata })
    .from(oauthCredentialsTable)
    .where(eq(oauthCredentialsTable.id, credentialId))
    .limit(FIRST_RESULT_LIMIT);

  const region = getZohoRegionFromMetadata(credential?.providerMetadata ?? null);

  const refreshZohoToken = createZohoTokenRefresher({
    clientId: env.ZOHO_CLIENT_ID,
    clientSecret: env.ZOHO_CLIENT_SECRET,
  });

  const tokenData = await refreshZohoToken(refreshToken, { region });
  const newExpiresAt = new Date(Date.now() + tokenData.expires_in * MS_PER_SECOND);

  await database
    .update(oauthCredentialsTable)
    .set({
      accessToken: tokenData.access_token,
      expiresAt: newExpiresAt,
      refreshToken: tokenData.refresh_token ?? refreshToken,
    })
    .where(eq(oauthCredentialsTable.id, credentialId));

  return {
    accessToken: tokenData.access_token,
    expiresAt: newExpiresAt,
  };
};

export {
  refreshGoogleAccessToken,
  refreshMicrosoftAccessToken,
  refreshZohoAccessToken,
  refreshGoogleSourceAccessToken,
  refreshMicrosoftSourceAccessToken,
  refreshZohoSourceAccessToken,
};
