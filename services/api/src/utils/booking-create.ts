import { bookingsTable } from "@keeper.sh/database/schema";
import { computeDayAvailability } from "./booking-availability";
import { formatDateInTimeZone } from "./booking-slots";
import type { ResolvedBookingTarget } from "@/queries/booking";
import type { BookingCreateBody } from "./request-body";
import type { EventInput, KeeperApi, KeeperDatabase } from "@/types";

const MS_PER_MINUTE = 60_000;

interface CreateBookingDeps {
  database: KeeperDatabase;
  keeperApi: KeeperApi;
}

interface BookingRecord {
  id: string;
  startTime: Date;
  endTime: Date;
  guestName: string;
  guestEmail: string;
  guestNotes: string | null;
  guestTimezone: string;
  cancelToken: string;
  userEventId: string;
}

type CreateBookingResult =
  | { status: "ok"; booking: BookingRecord }
  | { status: "invalid"; message: string }
  | { status: "unavailable" };

/**
 * Resolve the calendar location string for a booked event. Provider-generated
 * conferencing (Google Meet) is handled later; for now any configured value is
 * used verbatim.
 */
const resolveBookingLocation = (
  locationType: string,
  locationValue: string | null,
): string | null => {
  if (locationType === "none") {
    return null;
  }
  return locationValue ?? null;
};

const buildEventDescription = (body: BookingCreateBody): string => {
  const lines = [`Booked by ${body.guestName} (${body.guestEmail}).`];
  if (body.guestNotes) {
    lines.push("", body.guestNotes);
  }
  return lines.join("\n");
};

/**
 * Create a booking: re-validate the slot server-side, write the calendar event
 * (which the sync engine fans out to every connected calendar), then claim the
 * slot row. The partial unique index on confirmed `(eventTypeId, startTime)` is
 * the race backstop — a losing concurrent request gets an empty insert result,
 * so we roll back its orphan calendar event and report the slot as taken.
 */
const createBooking = async (
  deps: CreateBookingDeps,
  target: ResolvedBookingTarget,
  body: BookingCreateBody,
): Promise<CreateBookingResult> => {
  const { database, keeperApi } = deps;
  const { eventType } = target;

  const slotStart = new Date(body.slotStart);
  if (Number.isNaN(slotStart.getTime())) {
    return { status: "invalid", message: "slotStart must be a valid ISO timestamp." };
  }

  const date = formatDateInTimeZone(slotStart, eventType.timezone);
  const freeSlots = await computeDayAvailability(deps, eventType, date);
  const isFree = freeSlots.some((slot) => slot.getTime() === slotStart.getTime());
  if (!isFree) {
    return { status: "unavailable" };
  }

  const endTime = new Date(slotStart.getTime() + eventType.durationMinutes * MS_PER_MINUTE);
  const location = resolveBookingLocation(eventType.locationType, eventType.locationValue);

  const eventInput: EventInput = {
    calendarId: eventType.destinationCalendarId,
    title: `${eventType.title} — ${body.guestName}`,
    description: buildEventDescription(body),
    startTime: slotStart.toISOString(),
    endTime: endTime.toISOString(),
    availability: "busy",
    startTimeZone: eventType.timezone,
  };
  if (location) {
    eventInput.location = location;
  }

  const created = await keeperApi.createEvent(eventType.userId, eventInput);

  if (!created.success || !created.event) {
    return {
      status: "invalid",
      message: created.error ?? "Failed to create the calendar event.",
    };
  }

  const userEventId = created.event.id;
  const cancelToken = crypto.randomUUID();

  const [inserted] = await database
    .insert(bookingsTable)
    .values({
      eventTypeId: eventType.id,
      userEventId,
      guestName: body.guestName,
      guestEmail: body.guestEmail,
      guestNotes: body.guestNotes ?? null,
      guestTimezone: body.guestTimezone,
      startTime: slotStart,
      endTime,
      cancelToken,
    })
    .onConflictDoNothing()
    .returning({ id: bookingsTable.id });

  if (!inserted) {
    // Lost the race; roll back the orphan calendar event and report the slot taken.
    await keeperApi.deleteEvent(eventType.userId, userEventId);
    return { status: "unavailable" };
  }

  return {
    status: "ok",
    booking: {
      id: inserted.id,
      startTime: slotStart,
      endTime,
      guestName: body.guestName,
      guestEmail: body.guestEmail,
      guestNotes: body.guestNotes ?? null,
      guestTimezone: body.guestTimezone,
      cancelToken,
      userEventId,
    },
  };
};

export { createBooking, resolveBookingLocation };
export type { BookingRecord, CreateBookingDeps, CreateBookingResult };
