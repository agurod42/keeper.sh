import { describe, it, expect } from "vitest";
import { hasSessionCookie } from "../../src/lib/session-cookie";

describe("session-cookie", () => {
  it("detects session cookie", () => {
    expect(hasSessionCookie("keeper.has_session=1")).toBe(true);
    expect(hasSessionCookie("foo=bar; keeper.has_session=1; baz=qux")).toBe(true);
  });

  it("returns false if missing", () => {
    expect(hasSessionCookie("foo=bar")).toBe(false);
    expect(hasSessionCookie("")).toBe(false);
  });
});
