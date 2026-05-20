import { describe, it, expect } from "vitest";
import { isAuthError, hasRateLimitMessage } from "../../../../src/providers/zoho/shared/errors";

describe("Zoho errors shared", () => {
  describe("isAuthError", () => {
    it("returns true for 401", () => {
      expect(isAuthError(401, undefined)).toBe(true);
    });

    it("returns true for 403 with auth code", () => {
      expect(isAuthError(403, { code: "INVALID_TOKEN", message: "Error" })).toBe(true);
    });

    it("returns false for 400", () => {
      expect(isAuthError(400, { code: "BAD_REQUEST", message: "Error" })).toBe(false);
    });
  });

  describe("hasRateLimitMessage", () => {
    it("returns true for rate limit message", () => {
      expect(hasRateLimitMessage("Rate limit exceeded")).toBe(true);
      expect(hasRateLimitMessage("Error 429")).toBe(true);
    });

    it("returns false for other messages", () => {
      expect(hasRateLimitMessage("Not found")).toBe(false);
    });
  });
});
