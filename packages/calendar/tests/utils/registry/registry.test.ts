import { describe, it, expect } from "vitest";
import { getProvider, getProvidersByAuthType, isOAuthProvider } from "../../../src/utils/registry/registry";

describe("registry utils", () => {
  it("getProvider returns definition", () => {
    const provider = getProvider("google");
    expect(provider).toBeDefined();
    expect(provider?.id).toBe("google");
  });

  it("getProvidersByAuthType filters correctly", () => {
    const oauth = getProvidersByAuthType("oauth");
    expect(oauth.length).toBeGreaterThan(0);
    expect(oauth.every(p => p.authType === "oauth")).toBe(true);
  });

  it("isOAuthProvider identifies correctly", () => {
    expect(isOAuthProvider("google")).toBe(true);
    expect(isOAuthProvider("ics")).toBe(false);
  });
});
