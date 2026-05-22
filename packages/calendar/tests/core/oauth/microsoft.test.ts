import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createMicrosoftOAuthService, fetchUserInfo, createMicrosoftTokenRefresher } from "../../../src/core/oauth/microsoft";

const originalFetch = globalThis.fetch;

describe("Microsoft OAuth service", () => {
  const credentials = { clientId: "id", clientSecret: "secret" };
  const mockStore = {
    set: vi.fn().mockResolvedValue(undefined),
    consume: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("getAuthorizationUrl returns valid URL", async () => {
    const service = createMicrosoftOAuthService(credentials, mockStore as any);
    const url = await service.getAuthorizationUrl("u1", { callbackUrl: "http://cb" });
    expect(url).toContain("login.microsoftonline.com");
    expect(url).toContain("client_id=id");
    expect(url).toContain("state=");
  });

  it("exchangeCodeForTokens calls token endpoint", async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: "at",
        refresh_token: "rt",
        expires_in: 3600,
        token_type: "Bearer",
        scope: "Calendars.Read",
      }),
    });

    const service = createMicrosoftOAuthService(credentials, mockStore as any);
    const tokens = await service.exchangeCodeForTokens("code", "http://cb");
    
    expect(tokens.access_token).toBe("at");
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("fetchUserInfo returns user profile", async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "m1",
        mail: "test@outlook.com",
        displayName: "Test User",
      }),
    });

    const info = await fetchUserInfo("at");
    expect(info.mail).toBe("test@outlook.com");
  });
});

describe("createMicrosoftTokenRefresher", () => {
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
        scope: "Calendars.Read",
        token_type: "Bearer",
      }),
    });

    const refresh = createMicrosoftTokenRefresher(credentials);
    const result = await refresh("old-rt");

    expect(result.access_token).toBe("new-at");
  });
});
