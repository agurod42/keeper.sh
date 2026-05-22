import { describe, it, expect } from "vitest";
import { isOAuthReauthRequiredError } from "../../../src/core/oauth/error-classification";

describe("error-classification", () => {
  it("identifies reauth required by property", () => {
    expect(isOAuthReauthRequiredError({ oauthReauthRequired: true })).toBe(true);
  });

  it("identifies reauth required by message", () => {
    expect(isOAuthReauthRequiredError(new Error("invalid_grant"))).toBe(true);
  });

  it("returns false for other errors", () => {
    expect(isOAuthReauthRequiredError(new Error("some other error"))).toBe(false);
    expect(isOAuthReauthRequiredError(null)).toBe(false);
    expect(isOAuthReauthRequiredError({ oauthReauthRequired: "not-bool" })).toBe(false);
  });
});
