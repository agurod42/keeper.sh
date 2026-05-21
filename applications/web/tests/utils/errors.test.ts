import { describe, it, expect } from "vitest";
import { resolveErrorMessage } from "../../src/utils/errors";

describe("errors utils", () => {
  it("returns error message if error is Error", () => {
    expect(resolveErrorMessage(new Error("fail"), "fallback")).toBe("fail");
  });

  it("returns fallback if error is not Error", () => {
    expect(resolveErrorMessage("string", "fallback")).toBe("fallback");
    expect(resolveErrorMessage(null, "fallback")).toBe("fallback");
  });
});
