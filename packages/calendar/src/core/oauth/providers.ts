import {
  createGoogleOAuthService,
  fetchUserInfo as fetchGoogleUserInfo,
  hasRequiredScopes as hasRequiredGoogleScopes,
} from "./google";
import type { GoogleOAuthCredentials, ValidatedState, OAuthStateStore } from "./google";
import {
  createMicrosoftOAuthService,
  fetchUserInfo as fetchMicrosoftUserInfo,
  hasRequiredScopes as hasRequiredMicrosoftScopes,
} from "./microsoft";
import type { MicrosoftOAuthCredentials } from "./microsoft";
import {
  createZohoOAuthService,
  fetchUserInfo as fetchZohoUserInfo,
  hasRequiredScopes as hasRequiredZohoScopes,
  resolveZohoRegion,
  buildProviderMetadata as buildZohoProviderMetadata,
} from "./zoho";
import type { ZohoOAuthCredentials, ZohoProviderMetadata } from "./zoho";
import { validateState } from "./state";

interface AuthorizationUrlOptions {
  callbackUrl: string;
  scopes?: string[];
  destinationId?: string;
  sourceCredentialId?: string;
  region?: string;
}

interface NormalizedUserInfo {
  id: string;
  email: string;
}

interface OAuthTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
}

interface OAuthExchangeOptions {
  region?: string;
}

interface OAuthRefreshOptions {
  region?: string;
}

interface OAuthUserInfoOptions {
  region?: string;
}

interface OAuthProvider {
  getAuthorizationUrl: (userId: string, options: AuthorizationUrlOptions) => Promise<string>;
  exchangeCodeForTokens: (
    code: string,
    callbackUrl: string,
    options?: OAuthExchangeOptions,
  ) => Promise<OAuthTokens>;
  fetchUserInfo: (
    accessToken: string,
    options?: OAuthUserInfoOptions,
  ) => Promise<NormalizedUserInfo>;
  refreshAccessToken: (
    refreshToken: string,
    options?: OAuthRefreshOptions,
  ) => Promise<OAuthTokens>;
  hasRequiredScopes: (grantedScopes: string) => boolean;
  /**
   * Optional hook to build per-credential metadata (e.g. Zoho region) to be
   * persisted alongside the OAuth credential row. Returns null when the
   * provider doesn't need extra metadata.
   */
  buildCredentialMetadata?: (options: {
    region?: string | null;
  }) => Record<string, unknown> | null;
}

interface OAuthProvidersConfig {
  google: GoogleOAuthCredentials | null;
  microsoft: MicrosoftOAuthCredentials | null;
  zoho: ZohoOAuthCredentials | null;
}

interface OAuthProviders {
  getProvider: (providerId: string) => OAuthProvider | undefined;
  isOAuthProvider: (providerId: string) => boolean;
  validateState: (state: string) => Promise<ValidatedState | null>;
  hasRequiredScopes: (providerId: string, grantedScopes: string) => boolean;
}

const createOAuthProviders = (
  config: OAuthProvidersConfig,
  stateStore: OAuthStateStore,
): OAuthProviders => {
  const providers: Record<string, OAuthProvider> = {};

  if (config.google) {
    const googleService = createGoogleOAuthService(config.google, stateStore);
    providers.google = {
      exchangeCodeForTokens: googleService.exchangeCodeForTokens,
      fetchUserInfo: async (accessToken): Promise<NormalizedUserInfo> => {
        const info = await fetchGoogleUserInfo(accessToken);
        return { email: info.email, id: info.id };
      },
      getAuthorizationUrl: googleService.getAuthorizationUrl,
      hasRequiredScopes: hasRequiredGoogleScopes,
      refreshAccessToken: googleService.refreshAccessToken,
    };
  }

  if (config.microsoft) {
    const microsoftService = createMicrosoftOAuthService(config.microsoft, stateStore);
    providers.outlook = {
      exchangeCodeForTokens: microsoftService.exchangeCodeForTokens,
      fetchUserInfo: async (accessToken): Promise<NormalizedUserInfo> => {
        const info = await fetchMicrosoftUserInfo(accessToken);
        return { email: info.mail ?? info.userPrincipalName ?? "", id: info.id };
      },
      getAuthorizationUrl: microsoftService.getAuthorizationUrl,
      hasRequiredScopes: hasRequiredMicrosoftScopes,
      refreshAccessToken: microsoftService.refreshAccessToken,
    };
  }

  if (config.zoho) {
    const zohoService = createZohoOAuthService(config.zoho, stateStore);
    providers.zoho = {
      buildCredentialMetadata: ({ region }): ZohoProviderMetadata => {
        const resolved = resolveZohoRegion(region);
        return buildZohoProviderMetadata(resolved);
      },
      exchangeCodeForTokens: zohoService.exchangeCodeForTokens,
      fetchUserInfo: async (accessToken, options): Promise<NormalizedUserInfo> => {
        const region = resolveZohoRegion(options?.region);
        const info = await fetchZohoUserInfo(accessToken, region);
        const id = typeof info.ZUID === "number" ? String(info.ZUID) : info.ZUID;
        return { email: info.Email ?? "", id };
      },
      getAuthorizationUrl: zohoService.getAuthorizationUrl,
      hasRequiredScopes: hasRequiredZohoScopes,
      refreshAccessToken: zohoService.refreshAccessToken,
    };
  }

  const getProvider = (providerId: string): OAuthProvider | undefined => providers[providerId];

  const isOAuthProvider = (providerId: string): boolean => providerId in providers;

  const handleValidateState = (state: string): Promise<ValidatedState | null> =>
    validateState(stateStore, state);

  const hasRequiredScopes = (providerId: string, grantedScopes: string): boolean => {
    const provider = providers[providerId];
    if (!provider) {
      return false;
    }
    return provider.hasRequiredScopes(grantedScopes);
  };

  return { getProvider, hasRequiredScopes, isOAuthProvider, validateState: handleValidateState };
};

export { createOAuthProviders };
export type {
  ValidatedState,
  AuthorizationUrlOptions,
  NormalizedUserInfo,
  OAuthTokens,
  OAuthProvider,
  OAuthProvidersConfig,
  OAuthProviders,
  OAuthStateStore,
  OAuthExchangeOptions,
  OAuthRefreshOptions,
  OAuthUserInfoOptions,
};
