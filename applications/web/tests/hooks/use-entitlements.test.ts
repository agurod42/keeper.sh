import { describe, it, expect, vi } from "vitest";
import { canAddMore } from "../../src/hooks/use-entitlements";

describe("use-entitlements utils", () => {
  describe("canAddMore", () => {
    it("returns true if limit is null", () => {
      expect(canAddMore({ current: 10, limit: null })).toBe(true);
    });

    it("returns true if current < limit", () => {
      expect(canAddMore({ current: 4, limit: 5 })).toBe(true);
    });

    it("returns false if current >= limit", () => {
      expect(canAddMore({ current: 5, limit: 5 })).toBe(false);
      expect(canAddMore({ current: 6, limit: 5 })).toBe(false);
    });

    it("returns true if undefined", () => {
      expect(canAddMore(undefined)).toBe(true);
    });
  });
});
