import { oauthCredentialsTable } from "@keeper.sh/database/schema";
import { and, eq } from "drizzle-orm";
import { database } from "@/context";

const FIRST_RESULT_LIMIT = 1;

interface CreateOAuthSourceCredentialData {
  provider: string;
  email: string | null;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  providerMetadata?: Record<string, unknown> | null;
}

const createOAuthSourceCredential = async (
  userId: string,
  data: CreateOAuthSourceCredentialData,
): Promise<string> => {
  const [existing] = await database
    .select({ id: oauthCredentialsTable.id })
    .from(oauthCredentialsTable)
    .where(
      and(
        eq(oauthCredentialsTable.userId, userId),
        eq(oauthCredentialsTable.provider, data.provider),
        eq(oauthCredentialsTable.email, data.email ?? ""),
      ),
    )
    .limit(FIRST_RESULT_LIMIT);

  if (existing) {
    const updateSet: {
      accessToken: string;
      expiresAt: Date;
      needsReauthentication: boolean;
      refreshToken: string;
      providerMetadata?: Record<string, unknown>;
    } = {
      accessToken: data.accessToken,
      expiresAt: data.expiresAt,
      needsReauthentication: false,
      refreshToken: data.refreshToken,
    };
    if (data.providerMetadata) {
      updateSet.providerMetadata = data.providerMetadata;
    }

    await database
      .update(oauthCredentialsTable)
      .set(updateSet)
      .where(eq(oauthCredentialsTable.id, existing.id));

    return existing.id;
  }

  const [credential] = await database
    .insert(oauthCredentialsTable)
    .values({
      accessToken: data.accessToken,
      email: data.email,
      expiresAt: data.expiresAt,
      provider: data.provider,
      providerMetadata: data.providerMetadata ?? {},
      refreshToken: data.refreshToken,
      userId,
    })
    .returning({ id: oauthCredentialsTable.id });

  if (!credential) {
    throw new Error("Failed to create OAuth source credential");
  }

  return credential.id;
};

export { createOAuthSourceCredential };
