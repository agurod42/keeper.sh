import { describe, it, expect, vi, beforeEach } from "vitest";
import { computeDayAvailability } from "../../src/utils/booking-availability";
import { getAvailabilityRules, getConfirmedBookingIntervals } from "../../src/queries/booking";
import type { ResolvedEventType } from "../../src/queries/booking";

vi.mock("../../src/queries/booking", () => ({
  getAvailabilityRules: vi.fn(),
  getConfirmedBookingIntervals: vi.fn(),
}));

const rulesMock = vi.mocked(getAvailabilityRules);
const bookingsMock = vi.mocked(getConfirmedBookingIntervals);

// A fixed future date keeps slots ahead of the real `now` the helper reads.
// Montevideo is a permanent UTC-3 zone, so 09:00–12:00 local maps to 12:00–15:00Z.
const TEST_DATE = "2035-01-08";
const WEEKDAY = new Date(Date.UTC(2035, 0, 8)).getUTCDay();
const at = (time: string): Date => new Date(`${TEST_DATE}T${time}`);

const getEventsInRange = vi.fn();
const keeperApi = { getEventsInRange } as never;
const database = {} as never;

const eventType = (overrides: Partial<ResolvedEventType> = {}): ResolvedEventType => ({
  id: "evt-1",
  userId: "user-1",
  slug: "intro",
  title: "Intro",
  description: null,
  durationMinutes: 60,
  bufferBeforeMinutes: 0,
  bufferAfterMinutes: 0,
  minNoticeMinutes: 0,
  maxAdvanceDays: 36_500,
  maxBookingsPerDay: null,
  timezone: "America/Montevideo",
  destinationCalendarId: "cal-1",
  conflictCalendarIds: null,
  locationType: "none",
  locationValue: null,
  color: null,
  isActive: true,
  ...overrides,
});

describe("computeDayAvailability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getEventsInRange.mockResolvedValue([]);
    rulesMock.mockResolvedValue([{ weekday: WEEKDAY, startMinute: 540, endMinute: 720 }]);
    bookingsMock.mockResolvedValue([]);
  });

  it("returns slots from the merged busy view on an open day", async () => {
    const slots = await computeDayAvailability({ database, keeperApi }, eventType(), TEST_DATE);
    expect(slots.map((slot) => slot.toISOString())).toEqual([
      `${TEST_DATE}T12:00:00.000Z`,
      `${TEST_DATE}T13:00:00.000Z`,
      `${TEST_DATE}T14:00:00.000Z`,
    ]);
  });

  it("returns no slots once the per-day cap is reached", async () => {
    bookingsMock.mockResolvedValue([
      { start: at("12:00:00.000Z"), end: at("13:00:00.000Z") },
      { start: at("13:00:00.000Z"), end: at("14:00:00.000Z") },
    ]);
    const slots = await computeDayAvailability(
      { database, keeperApi },
      eventType({ maxBookingsPerDay: 2 }),
      TEST_DATE,
    );
    expect(slots).toEqual([]);
  });

  it("still offers remaining slots below the cap", async () => {
    bookingsMock.mockResolvedValue([{ start: at("12:00:00.000Z"), end: at("13:00:00.000Z") }]);
    const slots = await computeDayAvailability(
      { database, keeperApi },
      eventType({ maxBookingsPerDay: 3 }),
      TEST_DATE,
    );
    // The 12:00 slot is busy (booked); 13:00 and 14:00 remain.
    expect(slots.map((slot) => slot.toISOString())).toEqual([
      `${TEST_DATE}T13:00:00.000Z`,
      `${TEST_DATE}T14:00:00.000Z`,
    ]);
  });
});
