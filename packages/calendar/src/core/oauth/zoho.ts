import { zohoTokenResponseSchema, zohoUserInfoSchema } from "@keeper.sh/data-schemas";
import type { ZohoTokenResponse, ZohoUserInfo } from "@keeper.sh/data-schemas";
import { generateState, validateState } from "./state";
import type { ValidatedState, OAuthStateStore } from "./state";

/**
 * Zoho operates four independent datacenters. Each user's tokens only work
 * against their home region. The OAuth client_id/secret are global, but the
 * URLs and the calendar API base differ.
 *
 * Empirically validated against `agu@realmint.io` (US region) on 2026-05-13.
 * See `Engineering/Operations/Zoho Calendar API - notes.md` for the probes.
 */
const ZOHO_REGIONS = {
  au: {
    accountsBase: "https://accounts.zoho.com.au",
    calendarApiBase: "https://calendar.zoho.com.au/api/v1",
  },
  eu: {
    accountsBase: "https://accounts.zoho.eu",
    calendarApiBase: "https://calendar.zoho.eu/api/v1",
  },
  in: {
    accountsBase: "https://accounts.zoho.in",
    calendarApiBase: "https://calendar.zoho.in/api/v1",
  },
  us: {
    accountsBase: "https://accounts.zoho.com",
    calendarApiBase: "https://calendar.zoho.com/api/v1",
  },
} as const satisfies Record<string, { accountsBase: string; calendarApiBase: string }>;

type ZohoRegion = keyof typeof ZOHO_REGIONS;

const ZOHO_REGION_IDS = Object.keys(ZOHO_REGIONS) as ZohoRegion[];
const ZOHO_DEFAULT_REGION: ZohoRegion = "us";

const isZohoRegion = (value: unknown): value is ZohoRegion =>
  typeof value === "string" && (ZOHO_REGION_IDS as readonly string[]).includes(value);

const resolveZohoRegion = (value: string | null | undefined): ZohoRegion => {
  if (isZohoRegion(value)) {
    return value;
  }
  return ZOHO_DEFAULT_REGION;
};

const ZOHO_CALENDAR_SCOPE = "ZohoCalendar.calendar.ALL";
const ZOHO_EVENT_SCOPE = "ZohoCalendar.event.ALL";
const ZOHO_GROUP_SCOPE = "ZohoCalendar.group.READ";
const REQUEST_TIMEOUT_MS = 15_000;

const isRequestTimeoutError = (error: unknown): boolean =>
  error instanceof Error
  && (error.name === "AbortError" || error.name === "TimeoutError");

interface ZohoOAuthCredentials {
  clientId: string;
  clientSecret: string;
}

interface ZohoProviderMetadata {
  region: ZohoRegion;
  calendarApiBase: string;
  /**
   * Index signature so this type satisfies `Record<string, unknown>` consumers
   * (in particular, `OAuthProvider.buildCredentialMetadata` which returns a
   * jsonb-shaped record).
   */
  [key: string]: unknown;
}

interface AuthorizationUrlOptions {
  callbackUrl: string;
  scopes?: string[];
  destinationId?: string;
  sourceCredentialId?: string;
  region?: string;
}

interface ZohoOAuthService {
  getAuthorizationUrl: (userId: string, options: AuthorizationUrlOptions) => Promise<string>;
  exchangeCodeForTokens: (
    code: string,
    callbackUrl: string,
    options?: { region?: string },
  ) => Promise<ZohoTokenResponse>;
  refreshAccessToken: (
    refreshToken: string,
    options?: { region?: string },
  ) => Promise<ZohoTokenResponse>;
}

const buildTokenUrl = (region: ZohoRegion): string =>
  `${ZOHO_REGIONS[region].accountsBase}/oauth/v2/token`;

const buildAuthorizationUrl = (region: ZohoRegion): string =>
  `${ZOHO_REGIONS[region].accountsBase}/oauth/v2/auth`;

const buildUserInfoUrl = (region: ZohoRegion): string =>
  `${ZOHO_REGIONS[region].accountsBase}/oauth/user/info`;

const createZohoTokenRefresher = (
  credentials: ZohoOAuthCredentials,
) => {
  const { clientId, clientSecret } = credentials;

  return async (
    refreshToken: string,
    options?: { region?: string },
  ): Promise<ZohoTokenResponse> => {
    const region = resolveZohoRegion(options?.region);
    const tokenUrl = buildTokenUrl(region);

    const response = await fetch(tokenUrl, {
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      method: "POST",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    }).catch((error) => {
      if (isRequestTimeoutError(error)) {
        throw new Error(`Token refresh timed out after ${REQUEST_TIMEOUT_MS}ms`);
      }
      throw error;
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token refresh failed (${response.status}): ${error}`);
    }

    const body = await response.json();
    return zohoTokenResponseSchema.assert(body);
  };
};

const createZohoOAuthService = (
  credentials: ZohoOAuthCredentials,
  stateStore: OAuthStateStore,
): ZohoOAuthService => {
  const { clientId, clientSecret } = credentials;
  const refresher = createZohoTokenRefresher(credentials);

  const getAuthorizationUrl = async (
    userId: string,
    options: AuthorizationUrlOptions,
  ): Promise<string> => {
    const region = resolveZohoRegion(options.region);
    const state = await generateState(stateStore, userId, {
      destinationId: options.destinationId,
      region,
      sourceCredentialId: options.sourceCredentialId,
    });
    const scopes = options.scopes ?? [
      ZOHO_CALENDAR_SCOPE,
      ZOHO_EVENT_SCOPE,
      ZOHO_GROUP_SCOPE,
    ];

    const url = new URL(buildAuthorizationUrl(region));
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", options.callbackUrl);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", scopes.join(","));
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("state", state);

    return url.toString();
  };

  const exchangeCodeForTokens = async (
    code: string,
    callbackUrl: string,
    options?: { region?: string },
  ): Promise<ZohoTokenResponse> => {
    const region = resolveZohoRegion(options?.region);
    const tokenUrl = buildTokenUrl(region);

    const response = await fetch(tokenUrl, {
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: callbackUrl,
      }),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      method: "POST",
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token exchange failed (${response.status}): ${error}`);
    }

    const body = await response.json();
    return zohoTokenResponseSchema.assert(body);
  };

  return {
    exchangeCodeForTokens,
    getAuthorizationUrl,
    refreshAccessToken: refresher,
  };
};

const fetchUserInfo = async (
  accessToken: string,
  region: ZohoRegion = ZOHO_DEFAULT_REGION,
): Promise<ZohoUserInfo> => {
  const url = buildUserInfoUrl(region);
  const response = await fetch(url, {
    headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch user info: ${response.status}`);
  }

  const body = await response.json();
  return zohoUserInfoSchema.assert(body);
};

/**
 * Zoho returns granted scopes as a comma-separated string (e.g.
 * "ZohoCalendar.calendar.ALL,ZohoCalendar.event.ALL"). We require at least
 * the calendar and event scopes; group scope is optional (gated by Zoho
 * even when requested, based on empirical probes).
 */
const hasRequiredScopes = (grantedScopes: string): boolean => {
  const scopes = grantedScopes.split(/[,\s]+/).map((scope) => scope.trim());
  return scopes.includes(ZOHO_CALENDAR_SCOPE) && scopes.includes(ZOHO_EVENT_SCOPE);
};

const buildProviderMetadata = (region: ZohoRegion): ZohoProviderMetadata => ({
  calendarApiBase: ZOHO_REGIONS[region].calendarApiBase,
  region,
});

const getCalendarApiBaseFromMetadata = (
  metadata: unknown,
): string => {
  if (
    metadata
    && typeof metadata === "object"
    && "calendarApiBase" in metadata
    && typeof (metadata as Record<string, unknown>).calendarApiBase === "string"
  ) {
    return (metadata as { calendarApiBase: string }).calendarApiBase;
  }
  return ZOHO_REGIONS[ZOHO_DEFAULT_REGION].calendarApiBase;
};

const getRegionFromMetadata = (metadata: unknown): ZohoRegion => {
  if (
    metadata
    && typeof metadata === "object"
    && "region" in metadata
  ) {
    return resolveZohoRegion((metadata as Record<string, unknown>).region as string);
  }
  return ZOHO_DEFAULT_REGION;
};

export {
  createZohoTokenRefresher,
  createZohoOAuthService,
  fetchUserInfo,
  hasRequiredScopes,
  validateState,
  ZOHO_REGIONS,
  ZOHO_REGION_IDS,
  ZOHO_DEFAULT_REGION,
  ZOHO_CALENDAR_SCOPE,
  ZOHO_EVENT_SCOPE,
  ZOHO_GROUP_SCOPE,
  isZohoRegion,
  resolveZohoRegion,
  buildProviderMetadata,
  getCalendarApiBaseFromMetadata,
  getRegionFromMetadata,
};
export type {
  ValidatedState,
  ZohoOAuthCredentials,
  ZohoProviderMetadata,
  ZohoRegion,
  AuthorizationUrlOptions,
  ZohoOAuthService,
  ZohoTokenResponse,
  ZohoUserInfo,
};
