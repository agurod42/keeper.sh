import { describe, it, expect, vi } from "vitest";
import { getSourceProvider } from "../../../src/utils/registry/server";

vi.mock("../../../src/providers/google", () => ({
  createGoogleCalendarSourceProvider: vi.fn(() => ({ name: "google" })),
}));

describe("server registry utils", () => {
  it("getSourceProvider returns provider if found", () => {
    const mockOauthProviders = {
      getProvider: vi.fn(() => ({})),
    };
    const config = {
      database: {} as any,
      oauthProviders: mockOauthProviders as any,
    };
    const provider = getSourceProvider("google", config);
    expect(provider).toBeDefined();
    expect(provider?.name).toBe("google");
  });

  it("returns null if provider not found", () => {
    const mockOauthProviders = {
      getProvider: vi.fn(() => undefined),
    };
    const config = {
      database: {} as any,
      oauthProviders: mockOauthProviders as any,
    };
    const provider = getSourceProvider("unknown", config);
    expect(provider).toBeNull();
  });
});
