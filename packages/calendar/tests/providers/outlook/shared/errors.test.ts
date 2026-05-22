import { describe, it, expect } from "vitest";
import { hasRateLimitMessage, isAuthError, isSimpleAuthError } from "../../../../src/providers/outlook/shared/errors";

describe("Outlook error utils", () => {
  it("hasRateLimitMessage identifies 429", () => {
    expect(hasRateLimitMessage("error 429")).toBe(true);
    expect(hasRateLimitMessage("throttled")).toBe(true);
    expect(hasRateLimitMessage("other")).toBe(false);
  });

  it("isAuthError identifies errors", () => {
    expect(isAuthError(401, { code: "InvalidAuthenticationToken" })).toBe(true);
    expect(isAuthError(403, { code: "ErrorAccessDenied" })).toBe(true);
    expect(isAuthError(404, {})).toBe(false);
  });

  it("isSimpleAuthError identifies status codes", () => {
    expect(isSimpleAuthError(401)).toBe(true);
    expect(isSimpleAuthError(403)).toBe(true);
    expect(isSimpleAuthError(200)).toBe(false);
  });
});
