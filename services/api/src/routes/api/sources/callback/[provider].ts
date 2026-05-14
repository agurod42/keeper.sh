import { withWideEvent } from "@/utils/middleware";
import { ErrorResponse } from "@/utils/responses";
import { widelog } from "@/utils/logging";
import { buildRedirectUrl, OAuthError } from "@/utils/oauth";
import { oauthCallbackQuerySchema, providerParamSchema } from "@/utils/request-query";
import {
  buildCredentialMetadata,
  exchangeCodeForTokens,
  fetchUserInfo,
  validateState,
} from "@/utils/destinations";
import { createOAuthSourceCredential } from "@/utils/oauth-source-credentials";
import { importOAuthAccountCalendars } from "@/utils/oauth-sources";
import { baseUrl } from "@/context";

const MS_PER_SECOND = 1000;

const GET = withWideEvent(async ({ request, params }) => {
  if (!params.provider || !providerParamSchema.allows(params)) {
    return ErrorResponse.notFound().toResponse();
  }

  widelog.set("provider.name", params.provider);

  const { provider } = params;

  const errorUrl = buildRedirectUrl("/dashboard/integrations", baseUrl, {
    error: "Failed to connect source",
    source: "error",
  });

  const buildDebugErrorUrl = (label: string, detail: string): URL =>
    buildRedirectUrl("/dashboard/integrations", baseUrl, {
      debugLabel: label,
      debugMessage: detail.slice(0, 500),
      error: "Failed to connect source",
      source: "error",
    });

  try {
    const url = new URL(request.url);
    const callbackQuery = Object.fromEntries(url.searchParams.entries());
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (!oauthCallbackQuerySchema.allows(callbackQuery)) {
      throw new OAuthError("Invalid callback query parameters", errorUrl);
    }

    if (error) {
      throw new OAuthError("OAuth error from provider", errorUrl);
    }

    if (!code || !state) {
      throw new OAuthError("Missing code or state", errorUrl);
    }

    const validatedState = await validateState(state);
    if (!validatedState) {
      throw new OAuthError("Invalid or expired state", errorUrl);
    }

    const { userId, region } = validatedState;

    const callbackUrl = new URL(`/api/sources/callback/${provider}`, baseUrl);
    const exchangeOptions = region ? { region } : undefined;
    const tokens = await exchangeCodeForTokens(
      provider,
      code,
      callbackUrl.toString(),
      exchangeOptions,
    );

    if (!tokens.refresh_token) {
      throw new OAuthError("No refresh token", errorUrl);
    }

    const userInfoOptions = region ? { region } : undefined;
    const userInfo = await fetchUserInfo(provider, tokens.access_token, userInfoOptions);
    const expiresAt = new Date(Date.now() + tokens.expires_in * MS_PER_SECOND);

    const providerMetadata = buildCredentialMetadata(provider, { region });

    const credentialId = await createOAuthSourceCredential(userId, {
      accessToken: tokens.access_token,
      email: userInfo.email,
      expiresAt,
      provider,
      providerMetadata,
      refreshToken: tokens.refresh_token,
    });

    const accountId = await importOAuthAccountCalendars({
      accessToken: tokens.access_token,
      email: userInfo.email,
      oauthCredentialId: credentialId,
      provider,
      providerMetadata,
      userId,
    });

    const successUrl = buildRedirectUrl(`/dashboard/accounts/${accountId}/setup`, baseUrl);
    return Response.redirect(successUrl.toString());
  } catch (error) {
    const detail = error instanceof Error
      ? `${error.name}: ${error.message}`
      : String(error);

    if (error instanceof OAuthError) {
      widelog.errorFields(error, { slug: "oauth-callback-failed" });
      const debugUrl = buildDebugErrorUrl("oauth-callback-failed", detail);
      return Response.redirect(debugUrl.toString());
    }

    widelog.errorFields(error, { slug: "unclassified" });
    const debugUrl = buildDebugErrorUrl("unclassified", detail);
    return Response.redirect(debugUrl.toString());
  }
});

export { GET };
