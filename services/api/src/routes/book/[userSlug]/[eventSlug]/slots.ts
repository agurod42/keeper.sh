import { withWideEvent } from "@/utils/middleware";
import { ErrorResponse } from "@/utils/responses";
import { createKeeperApi } from "@/read-models";
import {
  getAvailabilityRules,
  getConfirmedBookingIntervals,
  resolveBookingTarget,
} from "@/queries/booking";
import { computeAvailableSlots, dayRangeInTimeZone } from "@/utils/booking-slots";
import type { BusyInterval } from "@/utils/booking-slots";
import type { KeeperEventFilters } from "@/types";
import { database, encryptionKey, oauthProviders, refreshLockStore } from "@/context";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const keeperApi = createKeeperApi(database, {
  oauthTokenRefresher: oauthProviders,
  refreshLockStore,
  encryptionKey,
});

/**
 * Free slot starts (ISO UTC) for one day. Availability rules are resolved in
 * the host timezone; busy time comes from the unified calendar view restricted
 * to the event type's conflict calendars, plus already-confirmed bookings. The
 * client renders the returned instants in the guest timezone.
 */
const GET = withWideEvent(async ({ request, params }) => {
  const { userSlug, eventSlug } = params;
  if (!userSlug || !eventSlug) {
    return ErrorResponse.notFound().toResponse();
  }

  const url = new URL(request.url);
  const date = url.searchParams.get("date");
  if (!date || !DATE_PATTERN.test(date)) {
    return ErrorResponse.badRequest("A valid date (YYYY-MM-DD) is required.").toResponse();
  }

  const target = await resolveBookingTarget(database, userSlug, eventSlug);
  if (!target) {
    return ErrorResponse.notFound().toResponse();
  }

  const { eventType } = target;
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

  const slots = computeAvailableSlots({
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

  return Response.json({ slots: slots.map((slot) => slot.toISOString()) });
});

export { GET };
