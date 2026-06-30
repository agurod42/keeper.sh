import {
  getAvailabilityRules,
  getConfirmedBookingIntervals,
} from "@/queries/booking";
import { computeAvailableSlots, dayRangeInTimeZone } from "./booking-slots";
import type { BusyInterval } from "./booking-slots";
import type { ResolvedEventType } from "@/queries/booking";
import type { KeeperApi, KeeperDatabase, KeeperEventFilters } from "@/types";

interface AvailabilityDeps {
  database: KeeperDatabase;
  keeperApi: KeeperApi;
}

/**
 * Free slot starts (UTC) for a single day of an event type. Busy time is the
 * unified calendar view restricted to the conflict calendars and to busy
 * availability, merged with already-confirmed bookings. Shared by the public
 * slots endpoint and the booking POST's server-side re-check.
 */
const computeDayAvailability = async (
  deps: AvailabilityDeps,
  eventType: ResolvedEventType,
  date: string,
): Promise<Date[]> => {
  const { database, keeperApi } = deps;
  const { from, to } = dayRangeInTimeZone(date, eventType.timezone);

  const filters: KeeperEventFilters = { availability: ["busy"] };
  if (eventType.conflictCalendarIds) {
    filters.calendarId = eventType.conflictCalendarIds;
  }

  const busyEvents = await keeperApi.getEventsInRange(
    eventType.userId,
    { from, to },
    filters,
  );

  const busyIntervals: BusyInterval[] = busyEvents.map((event) => ({
    start: new Date(event.startTime),
    end: new Date(event.endTime),
  }));

  const bookingIntervals = await getConfirmedBookingIntervals(
    database,
    eventType.id,
    from,
    to,
  );

  const rules = await getAvailabilityRules(database, eventType.id);

  return computeAvailableSlots({
    date,
    hostTimezone: eventType.timezone,
    durationMinutes: eventType.durationMinutes,
    rules,
    busy: [...busyIntervals, ...bookingIntervals],
    now: new Date(),
    minNoticeMinutes: eventType.minNoticeMinutes,
    maxAdvanceDays: eventType.maxAdvanceDays,
    bufferBeforeMinutes: eventType.bufferBeforeMinutes,
    bufferAfterMinutes: eventType.bufferAfterMinutes,
  });
};

export { computeDayAvailability };
export type { AvailabilityDeps };
