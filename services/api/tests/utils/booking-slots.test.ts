import { describe, it, expect } from "vitest";
import {
  computeAvailableSlots,
  dayRangeInTimeZone,
  weekdayForDate,
  zonedWallTimeToUtc,
} from "../../src/utils/booking-slots";
import type { AvailabilityRule, SlotComputationInput } from "../../src/utils/booking-slots";

const HOUR = 60;
const NOW = new Date("2025-01-01T00:00:00.000Z");
const FAR_FUTURE_DAYS = 3650;

const rule = (weekday: number, startMinute: number, endMinute: number): AvailabilityRule => ({
  weekday,
  startMinute,
  endMinute,
});

// 2025-01-06 is a Monday; Montevideo is a fixed UTC-3 zone (no DST).
const baseInput = (overrides: Partial<SlotComputationInput>): SlotComputationInput => ({
  date: "2025-01-06",
  hostTimezone: "America/Montevideo",
  durationMinutes: HOUR,
  rules: [],
  busy: [],
  now: NOW,
  minNoticeMinutes: 0,
  maxAdvanceDays: FAR_FUTURE_DAYS,
  bufferBeforeMinutes: 0,
  bufferAfterMinutes: 0,
  ...overrides,
});

const isoStarts = (slots: Date[]): string[] => slots.map((slot) => slot.toISOString());

describe("zonedWallTimeToUtc", () => {
  it("resolves a fixed-offset timezone (Montevideo, UTC-3)", () => {
    const instant = zonedWallTimeToUtc(2025, 1, 6, 9 * HOUR, "America/Montevideo");
    expect(instant.toISOString()).toBe("2025-01-06T12:00:00.000Z");
  });

  it("resolves UTC identically", () => {
    const instant = zonedWallTimeToUtc(2025, 1, 6, 9 * HOUR, "UTC");
    expect(instant.toISOString()).toBe("2025-01-06T09:00:00.000Z");
  });
});

describe("weekdayForDate", () => {
  it("returns 1 for a Monday and 0 for a Sunday", () => {
    expect(weekdayForDate("2025-01-06")).toBe(1);
    expect(weekdayForDate("2025-01-05")).toBe(0);
  });
});

describe("dayRangeInTimeZone", () => {
  it("spans local midnight to next midnight in host tz", () => {
    const { from, to } = dayRangeInTimeZone("2025-01-06", "America/Montevideo");
    expect(from.toISOString()).toBe("2025-01-06T03:00:00.000Z");
    expect(to.toISOString()).toBe("2025-01-07T03:00:00.000Z");
  });
});

describe("computeAvailableSlots", () => {
  it("produces back-to-back slots across an availability window in host tz", () => {
    const slots = computeAvailableSlots(
      baseInput({ rules: [rule(1, 9 * HOUR, 12 * HOUR)] }),
    );
    // 09:00, 10:00, 11:00 Montevideo (UTC-3) map to 12:00, 13:00, 14:00 UTC.
    expect(isoStarts(slots)).toEqual([
      "2025-01-06T12:00:00.000Z",
      "2025-01-06T13:00:00.000Z",
      "2025-01-06T14:00:00.000Z",
    ]);
  });

  it("returns UTC instants that the guest tz renders to its own wall clock", () => {
    const [firstSlot] = computeAvailableSlots(
      baseInput({ rules: [rule(1, 9 * HOUR, 10 * HOUR)] }),
    );
    // The host's 09:00 in Montevideo is 21:00 the same day in Tokyo (UTC+9).
    const tokyoWallClock = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Tokyo",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(firstSlot);
    expect(tokyoWallClock).toBe("21:00");
  });

  it("handles a DST spring-forward day: same local date, different UTC offsets", () => {
    // 2025-03-09 is the US spring-forward day (02:00 to 03:00, UTC-5 to UTC-4).
    const slots = computeAvailableSlots(
      baseInput({
        date: "2025-03-09",
        hostTimezone: "America/New_York",
        rules: [rule(0, 0, HOUR), rule(0, 12 * HOUR, 13 * HOUR)],
      }),
    );
    // 00:00 EST is UTC-5 (05:00Z); 12:00 EDT is UTC-4 (16:00Z).
    expect(isoStarts(slots)).toEqual([
      "2025-03-09T05:00:00.000Z",
      "2025-03-09T16:00:00.000Z",
    ]);
  });

  it("excludes a slot overlapping a busy interval", () => {
    const slots = computeAvailableSlots(
      baseInput({
        rules: [rule(1, 9 * HOUR, 12 * HOUR)],
        // 13:00Z is the 10:00 local slot.
        busy: [
          {
            start: new Date("2025-01-06T13:00:00.000Z"),
            end: new Date("2025-01-06T13:30:00.000Z"),
          },
        ],
      }),
    );
    expect(isoStarts(slots)).toEqual([
      "2025-01-06T12:00:00.000Z",
      "2025-01-06T14:00:00.000Z",
    ]);
  });

  it("applies before/after buffers when checking busy overlap", () => {
    const busy = [
      {
        start: new Date("2025-01-06T14:05:00.000Z"),
        end: new Date("2025-01-06T14:30:00.000Z"),
      },
    ];
    // The 13:00Z slot ends at 14:00Z and does not overlap busy starting 14:05Z.
    const withoutBuffer = computeAvailableSlots(
      baseInput({ rules: [rule(1, 9 * HOUR, 12 * HOUR)], busy }),
    );
    expect(isoStarts(withoutBuffer)).toContain("2025-01-06T13:00:00.000Z");

    // A 10-minute after-buffer extends the padded end to 14:10Z, overlapping busy.
    const withBuffer = computeAvailableSlots(
      baseInput({ rules: [rule(1, 9 * HOUR, 12 * HOUR)], busy, bufferAfterMinutes: 10 }),
    );
    expect(isoStarts(withBuffer)).not.toContain("2025-01-06T13:00:00.000Z");
  });

  it("drops slots inside the minimum-notice window", () => {
    const slots = computeAvailableSlots(
      baseInput({
        rules: [rule(1, 9 * HOUR, 12 * HOUR)],
        // 09:30 local; with 60-minute notice the earliest start is 13:30Z.
        now: new Date("2025-01-06T12:30:00.000Z"),
        minNoticeMinutes: 60,
      }),
    );
    expect(isoStarts(slots)).toEqual(["2025-01-06T14:00:00.000Z"]);
  });

  it("drops slots beyond the maximum advance window", () => {
    const slots = computeAvailableSlots(
      baseInput({
        rules: [rule(1, 9 * HOUR, 12 * HOUR)],
        now: new Date("2024-12-01T00:00:00.000Z"),
        maxAdvanceDays: 7,
      }),
    );
    expect(slots).toEqual([]);
  });

  it("returns nothing when no rule matches the weekday", () => {
    // Wednesday rule against a Monday date.
    const slots = computeAvailableSlots(
      baseInput({ rules: [rule(3, 9 * HOUR, 12 * HOUR)] }),
    );
    expect(slots).toEqual([]);
  });

  it("only emits slots that fully fit inside the window", () => {
    // A 90-minute window fits one 60-minute slot (09:00), not two.
    const slots = computeAvailableSlots(
      baseInput({ rules: [rule(1, 9 * HOUR, 9 * HOUR + 90)], durationMinutes: HOUR }),
    );
    expect(isoStarts(slots)).toEqual(["2025-01-06T12:00:00.000Z"]);
  });
});
