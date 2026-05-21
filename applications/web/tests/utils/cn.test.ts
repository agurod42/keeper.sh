import { describe, it, expect } from "vitest";
import { cn } from "../../src/utils/cn";

describe("cn", () => {
  it("merges classes", () => {
    expect(cn("a", "b")).toBe("a b");
    expect(cn("a", { b: true, c: false })).toBe("a b");
  });
});
