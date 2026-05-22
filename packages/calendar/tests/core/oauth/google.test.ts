import { afterEach, describe, expect, it, vi, beforeEach } from "vitest";
import { createGoogleOAuthService, createGoogleTokenRefresher } from "../../../src/core/oauth/google";

const originalFetch = globalThis.fetch;

describe("createGoogleTokenRefresher", () => {
  const credentials = { clientId: "id", clientSecret: "secret" };

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("refreshes token successfully", async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: "new-at",
        expires_in: 3600,
        token_type: "Bearer",
        scope: "https://www.googleapis.com/auth/calendar.events",
      }),
    });

    const refresh = createGoogleTokenRefresher(credentials);
    const result = await refresh("old-rt");

    expect(result.access_token).toBe("new-at");
  });

  it("retries on retriable status code", async () => {
    (globalThis.fetch as any)
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => JSON.stringify({ error: "server_error" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "new-at",
          expires_in: 3600,
          token_type: "Bearer",
          scope: "https://www.googleapis.com/auth/calendar.events",
        }),
      });

    const refresh = createGoogleTokenRefresher(credentials);
    const result = await refresh("old-rt");

    expect(result.access_token).toBe("new-at");
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });
});

const createTestStateStore = () => {
  const store = new Map<string, string>();
  return {
    consume: vi.fn(async (key: string) => {
      const val = store.get(key);
      store.delete(key);
      return val ?? null;
    }),
    set: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
  };
};

const credentials = {
  clientId: "test-client-id",
  clientSecret: "test-client-secret",
};

describe("Google OAuth service", () => {
  const stateStore = createTestStateStore();

  const createService = () => createGoogleOAuthService(credentials, stateStore);

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("generates a valid authorization URL", async () => {
    const service = createService();
    const url = await service.getAuthorizationUrl("user-1", {
      callbackUrl: "https://keeper.sh/callback",
    });

    const parsed = new URL(url);
    expect(parsed.origin).toBe("https://accounts.google.com");
    expect(parsed.pathname).toBe("/o/oauth2/v2/auth");
  });

  it("exchanges an authorization code for tokens", async () => {
    const mockTokens = {
      access_token: "access-token",
      expires_in: 3600,
      refresh_token: "refresh-token",
      token_type: "Bearer",
      scope: "https://www.googleapis.com/auth/calendar.events",
    };

    globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(mockTokens)));

    const service = createService();
    const tokens = await service.exchangeCodeForTokens("auth-code", "https://keeper.sh/callback");

    expect(tokens).toEqual(mockTokens);
  });

  it("refreshes an access token", async () => {
    const mockTokens = {
      access_token: "new-access-token",
      expires_in: 3600,
      token_type: "Bearer",
      scope: "https://www.googleapis.com/auth/calendar.events",
    };

    globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(mockTokens)));

    const service = createService();
    const tokens = await service.refreshAccessToken("refresh-token");

    expect(tokens).toEqual(mockTokens);
  });

  it("throws on failed token exchange", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response("Unauthorized", { status: 401 }));

    const service = createService();
    await expect(
      service.exchangeCodeForTokens("auth-code", "https://keeper.sh/callback"),
    ).rejects.toThrow("Token exchange failed (401)");
  });
});

describe("google oauth utils", () => {
  const { hasRequiredScopes } = require("../../../src/core/oauth/google");

  it("hasRequiredScopes returns true if calendar scope is present", () => {
    expect(hasRequiredScopes("https://www.googleapis.com/auth/calendar.events other")).toBe(true);
  });

  it("hasRequiredScopes returns false if missing calendar scope", () => {
    expect(hasRequiredScopes("openid email")).toBe(false);
  });
});
