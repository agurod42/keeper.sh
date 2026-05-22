import { describe, it, expect, vi } from "vitest";
import { createOAuthProviders } from "../../../src/core/oauth/providers";

describe("OAuthProviders", () => {
  const mockConfig = {
    google: { clientId: "g1", clientSecret: "gs1" },
    microsoft: null,
    zoho: null,
  };
  const mockStateStore = {} as any;

  it("returns google provider if configured", () => {
    const providers = createOAuthProviders(mockConfig, mockStateStore);
    expect(providers.isOAuthProvider("google")).toBe(true);
    expect(providers.isOAuthProvider("microsoft")).toBe(false);
  });

  it("getProvider returns undefined for missing provider", () => {
    const providers = createOAuthProviders(mockConfig, mockStateStore);
    expect(providers.getProvider("microsoft")).toBeUndefined();
  });
});
