import { describe, it, expect } from "vitest";
import { formatMonthYear } from "../../src/lib/page-metadata";

describe("page-metadata", () => {
  it("formatMonthYear formats correctly", () => {
    expect(formatMonthYear("2025-12-01")).toBe("December 2025");
  });
});
