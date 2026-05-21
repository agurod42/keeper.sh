import { describe, it, expect, vi } from "vitest";
import { createAuth } from "../src/index";

vi.mock("better-auth", () => ({
  betterAuth: vi.fn(() => ({
    api: {},
  })),
}));

vi.mock("better-auth/api", () => ({
  createAuthMiddleware: vi.fn(),
  createAuthEndpoint: vi.fn(),
}));

vi.mock("better-auth/adapters/drizzle", () => ({
  drizzleAdapter: vi.fn(),
}));

vi.mock("better-auth/plugins", () => ({
  jwt: vi.fn(),
}));

vi.mock("@better-auth/oauth-provider", () => ({
  oauthProvider: vi.fn(),
}));

vi.mock("@better-auth/passkey", () => ({
  passkey: vi.fn(),
}));

vi.mock("@polar-sh/better-auth", () => ({
  checkout: vi.fn(),
  polar: vi.fn(),
  portal: vi.fn(),
}));

describe("createAuth", () => {
  const mockDatabase = {} as any;
  const mockConfig = {
    database: mockDatabase,
    secret: "secret",
    baseUrl: "http://localhost:3000",
  };

  it("creates auth with default plugins in non-commercial mode", () => {
    const result = createAuth(mockConfig);
    expect(result.auth).toBeDefined();
    expect(result.capabilities).toBeDefined();
  });

  it("adds passkey plugin in commercial mode with RP config", () => {
    const result = createAuth({
      ...mockConfig,
      commercialMode: true,
      passkeyRpId: "id",
      passkeyRpName: "name",
      passkeyOrigin: "http://localhost:3000",
    });
    expect(result.auth).toBeDefined();
  });

  it("handles social providers if client IDs are provided", () => {
    const result = createAuth({
      ...mockConfig,
      googleClientId: "google-id",
      googleClientSecret: "google-secret",
    });
    expect(result.auth).toBeDefined();
  });

  it("handles resend integration if API key is provided", () => {
    const result = createAuth({
      ...mockConfig,
      resendApiKey: "resend-key",
      commercialMode: true,
    });
    expect(result.auth).toBeDefined();
  });

  it("handles polar integration if access token is provided", () => {
    const result = createAuth({
      ...mockConfig,
      polarAccessToken: "polar-token",
      polarMode: "sandbox",
    });
    expect(result.auth).toBeDefined();
    expect(result.polarClient).not.toBeNull();
  });

  it("isKeeperMcpEnabledAuth identifies MCP enabled auth", () => {
    const { isKeeperMcpEnabledAuth } = require("../src/index");
    const mockAuth = {
      api: {
        getMcpSession: vi.fn(),
        getMCPProtectedResource: vi.fn(),
        getMcpOAuthConfig: vi.fn(),
      },
    };
    expect(isKeeperMcpEnabledAuth(mockAuth)).toBe(true);
    expect(isKeeperMcpEnabledAuth({ api: {} })).toBe(false);
  });

  it("handles OAuthProviderAuthApi check", async () => {
    const { hasOAuthProviderApi } = await import("../src/index");
    expect(hasOAuthProviderApi({})).toBe(false);
    expect(hasOAuthProviderApi({
      getOAuthServerConfig: vi.fn(),
      getOpenIdConfig: vi.fn(),
    })).toBe(true);
  });
});
