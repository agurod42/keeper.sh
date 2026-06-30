import { describe, it, expect, vi, beforeEach } from "vitest";
import { createBooking } from "../../src/utils/booking-create";
import { computeDayAvailability } from "../../src/utils/booking-availability";
import type { ResolvedBookingTarget } from "../../src/queries/booking";
import type { BookingCreateBody } from "../../src/utils/request-body";

vi.mock("../../src/utils/booking-availability", () => ({
  computeDayAvailability: vi.fn(),
}));

const SLOT_START = "2025-01-06T12:00:00.000Z";

const target: ResolvedBookingTarget = {
  profile: { slug: "host", displayName: "Host", avatarUrl: null },
  eventType: {
    id: "evt-1",
    userId: "user-1",
    slug: "intro",
    title: "Intro call",
    description: null,
    durationMinutes: 30,
    bufferBeforeMinutes: 0,
    bufferAfterMinutes: 0,
    minNoticeMinutes: 0,
    maxAdvanceDays: 60,
    timezone: "America/Montevideo",
    destinationCalendarId: "cal-1",
    conflictCalendarIds: null,
    locationType: "none",
    locationValue: null,
    color: null,
    isActive: true,
  },
};

const body: BookingCreateBody = {
  slotStart: SLOT_START,
  guestName: "Test User",
  guestEmail: "test@example.org",
  guestTimezone: "Asia/Tokyo",
};

const insertChain = (returnedRows: { id: string }[]) => ({
  values: vi.fn().mockReturnThis(),
  onConflictDoNothing: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue(returnedRows),
});

describe("createBooking", () => {
  const computeMock = vi.mocked(computeDayAvailability);

  beforeEach(() => {
    vi.clearAllMocks();
    computeMock.mockResolvedValue([new Date(SLOT_START)]);
  });

  it("rejects a slotStart that is not currently free", async () => {
    computeMock.mockResolvedValue([new Date("2025-01-06T13:00:00.000Z")]);
    const keeperApi = { createEvent: vi.fn(), deleteEvent: vi.fn() } as never;
    const database = { insert: vi.fn() } as never;

    const result = await createBooking({ database, keeperApi }, target, body);

    expect(result.status).toBe("unavailable");
  });

  it("creates the event and persists the booking on the happy path", async () => {
    const createEvent = vi.fn().mockResolvedValue({ success: true, event: { id: "ue-1" } });
    const deleteEvent = vi.fn();
    const keeperApi = { createEvent, deleteEvent } as never;
    const database = { insert: vi.fn().mockReturnValue(insertChain([{ id: "booking-1" }])) } as never;

    const result = await createBooking({ database, keeperApi }, target, body);

    expect(createEvent).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        calendarId: "cal-1",
        availability: "busy",
        startTimeZone: "America/Montevideo",
        startTime: SLOT_START,
      }),
    );
    expect(deleteEvent).not.toHaveBeenCalled();
    expect(result).toMatchObject({ status: "ok", booking: { id: "booking-1", userEventId: "ue-1" } });
  });

  it("rolls back the calendar event when the slot row conflicts (race guard)", async () => {
    const createEvent = vi.fn().mockResolvedValue({ success: true, event: { id: "ue-1" } });
    const deleteEvent = vi.fn().mockResolvedValue({ success: true });
    const keeperApi = { createEvent, deleteEvent } as never;
    // Empty returning => ON CONFLICT DO NOTHING swallowed the insert.
    const database = { insert: vi.fn().mockReturnValue(insertChain([])) } as never;

    const result = await createBooking({ database, keeperApi }, target, body);

    expect(deleteEvent).toHaveBeenCalledWith("user-1", "ue-1");
    expect(result.status).toBe("unavailable");
  });

  it("returns invalid when the calendar event cannot be created", async () => {
    const createEvent = vi.fn().mockResolvedValue({ success: false, error: "Calendar not found." });
    const keeperApi = { createEvent, deleteEvent: vi.fn() } as never;
    const database = { insert: vi.fn() } as never;

    const result = await createBooking({ database, keeperApi }, target, body);

    expect(result).toMatchObject({ status: "invalid" });
  });
});
