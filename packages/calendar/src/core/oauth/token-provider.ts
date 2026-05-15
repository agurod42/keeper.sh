interface OAuthRefreshResult {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

interface OAuthRefreshOptions {
  /**
   * Provider-specific routing hint. Zoho uses this to pick the correct
   * datacenter accounts URL (`us`/`eu`/`in`/`au`). Other providers ignore it.
   */
  region?: string;
}

interface OAuthTokenProvider {
  refreshAccessToken: (
    refreshToken: string,
    options?: OAuthRefreshOptions,
  ) => Promise<OAuthRefreshResult>;
}

export type { OAuthRefreshResult, OAuthRefreshOptions, OAuthTokenProvider };
