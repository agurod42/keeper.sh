import { describe, expect, it } from "vitest";
import { resolveSourceColor, SOURCE_COLOR_PALETTE } from "../../src/utils/ical-source-color";

describe("resolveSourceColor", () => {
  it("returns the native color when it is a valid hex string", () => {
    expect(resolveSourceColor({ calendarId: "any", nativeColor: "#4285F4" })).toBe("#4285F4");
  });

  it("normalizes native color to uppercase hex", () => {
    expect(resolveSourceColor({ calendarId: "any", nativeColor: "#abcdef" })).toBe("#ABCDEF");
  });

  it("falls back to a palette color when native is missing", () => {
    const color = resolveSourceColor({ calendarId: "abc-123", nativeColor: null });
    expect(SOURCE_COLOR_PALETTE).toContain(color as (typeof SOURCE_COLOR_PALETTE)[number]);
  });

  it("falls back to a palette color when native is malformed", () => {
    const color = resolveSourceColor({ calendarId: "abc-123", nativeColor: "not-a-color" });
    expect(SOURCE_COLOR_PALETTE).toContain(color as (typeof SOURCE_COLOR_PALETTE)[number]);
  });

  it("is deterministic for the same calendar id", () => {
    const first = resolveSourceColor({ calendarId: "stable-id", nativeColor: null });
    const second = resolveSourceColor({ calendarId: "stable-id", nativeColor: null });
    expect(first).toBe(second);
  });

  it("distributes different ids across the palette (sanity)", () => {
    const colors = new Set(
      Array.from({ length: 100 }, (_, index) =>
        resolveSourceColor({ calendarId: `id-${index}`, nativeColor: null }),
      ),
    );
    expect(colors.size).toBeGreaterThan(1);
  });
});
