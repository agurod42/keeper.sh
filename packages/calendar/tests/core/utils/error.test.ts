import { describe, it, expect } from "vitest";
import { getErrorMessage } from "../../../src/core/utils/error";

describe("error utils", () => {
  it("extracts message from Error", () => {
    expect(getErrorMessage(new Error("fail"))).toBe("fail");
  });

  it("converts other types to string", () => {
    expect(getErrorMessage("string")).toBe("string");
    expect(getErrorMessage(123)).toBe("123");
    expect(getErrorMessage(null)).toBe("null");
  });
});
