import { describe, it, expect } from "vitest";
import { inferAllDayEvent, resolveIsAllDayEvent } from "../../../src/core/events/all-day";

describe("all-day event utils", () => {
  it("inferAllDayEvent detects all day correctly", () => {
    const start = new Date("2026-05-20T00:00:00Z");
    const end = new Date("2026-05-21T00:00:00Z");
    expect(inferAllDayEvent({ startTime: start, endTime: end })).toBe(true);

    const timed = new Date("2026-05-20T10:00:00Z");
    expect(inferAllDayEvent({ startTime: timed, endTime: end })).toBe(false);
  });

  it("resolveIsAllDayEvent respects explicit flag", () => {
    const start = new Date("2026-05-20T00:00:00Z");
    const end = new Date("2026-05-21T00:00:00Z");
    expect(resolveIsAllDayEvent({ startTime: start, endTime: end, isAllDay: false })).toBe(false);
  });
});
