import { describe, it, expect, vi } from "vitest";
import { formatTimeUntil, isEventPast, formatTime } from "../../src/lib/time";

describe("time lib", () => {
  it("formatTimeUntil returns relative time", () => {
    vi.useFakeTimers();
    const now = new Date("2026-05-20T10:00:00Z");
    vi.setSystemTime(now);

    const fiveMinsFuture = new Date("2026-05-20T10:05:00Z");
    expect(formatTimeUntil(fiveMinsFuture)).toBe("in 5m");

    const tenMinsPast = new Date("2026-05-20T09:50:00Z");
    expect(formatTimeUntil(tenMinsPast)).toBe("10m ago");

    vi.useRealTimers();
  });

  it("isEventPast checks correctly", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-20T10:00:00Z"));
    
    expect(isEventPast(new Date("2026-05-20T09:00:00Z"))).toBe(true);
    expect(isEventPast(new Date("2026-05-20T11:00:00Z"))).toBe(false);

    vi.useRealTimers();
  });

  it("formatTime returns formatted string", () => {
    const date = new Date();
    date.setHours(14, 30);
    expect(formatTime(date)).toBe("2:30 PM");
    
    date.setHours(9, 5);
    expect(formatTime(date)).toBe("9:05 AM");
  });
});
