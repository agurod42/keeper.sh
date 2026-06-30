import {
  availabilityRulesTable,
  bookingProfilesTable,
  bookingsTable,
  eventTypesTable,
} from "@keeper.sh/database/schema";
import { user as userTable } from "@keeper.sh/database/auth-schema";
import { and, eq, gte, lt } from "drizzle-orm";

import type { AvailabilityRule, BusyInterval } from "@/utils/booking-slots";
import type { KeeperDatabase } from "@/types";

const CONFIRMED_STATUS = "confirmed";

interface ResolvedEventType {
  id: string;
  userId: string;
  slug: string;
  title: string;
  description: string | null;
  durationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  minNoticeMinutes: number;
  maxAdvanceDays: number;
  maxBookingsPerDay: number | null;
  timezone: string;
  destinationCalendarId: string;
  conflictCalendarIds: string[] | null;
  locationType: string;
  locationValue: string | null;
  color: string | null;
  isActive: boolean;
}

interface ResolvedBookingTarget {
  profile: {
    slug: string;
    displayName: string;
    avatarUrl: string | null;
  };
  eventType: ResolvedEventType;
}

/**
 * Resolve a public `{userSlug}/{eventSlug}` pair to its host profile and active
 * event type. Returns null when either the profile or the active event type is
 * missing, so callers can answer 404 without leaking which half was absent.
 */
const resolveBookingTarget = async (
  database: KeeperDatabase,
  userSlug: string,
  eventSlug: string,
): Promise<ResolvedBookingTarget | null> => {
  const [row] = await database
    .select({
      profileSlug: bookingProfilesTable.slug,
      profileDisplayName: bookingProfilesTable.displayName,
      profileAvatarUrl: bookingProfilesTable.avatarUrl,
      eventType: eventTypesTable,
    })
    .from(bookingProfilesTable)
    .innerJoin(eventTypesTable, eq(eventTypesTable.userId, bookingProfilesTable.userId))
    .where(
      and(
        eq(bookingProfilesTable.slug, userSlug),
        eq(eventTypesTable.slug, eventSlug),
        eq(eventTypesTable.isActive, true),
      ),
    )
    .limit(1);

  if (!row) {
    return null;
  }

  return {
    profile: {
      slug: row.profileSlug,
      displayName: row.profileDisplayName,
      avatarUrl: row.profileAvatarUrl,
    },
    eventType: row.eventType,
  };
};

const getAvailabilityRules = async (
  database: KeeperDatabase,
  eventTypeId: string,
): Promise<AvailabilityRule[]> => {
  const rows = await database
    .select({
      weekday: availabilityRulesTable.weekday,
      startMinute: availabilityRulesTable.startMinute,
      endMinute: availabilityRulesTable.endMinute,
    })
    .from(availabilityRulesTable)
    .where(eq(availabilityRulesTable.eventTypeId, eventTypeId));

  return rows;
};

/**
 * Confirmed bookings for an event type that overlap [from, to), expressed as
 * busy intervals so the slot algorithm can subtract already-taken slots even
 * before they propagate into the synced calendar busy view.
 */
const getConfirmedBookingIntervals = async (
  database: KeeperDatabase,
  eventTypeId: string,
  from: Date,
  to: Date,
): Promise<BusyInterval[]> => {
  const rows = await database
    .select({
      start: bookingsTable.startTime,
      end: bookingsTable.endTime,
    })
    .from(bookingsTable)
    .where(
      and(
        eq(bookingsTable.eventTypeId, eventTypeId),
        eq(bookingsTable.status, CONFIRMED_STATUS),
        lt(bookingsTable.startTime, to),
        gte(bookingsTable.endTime, from),
      ),
    );

  return rows;
};

interface HostContact {
  name: string;
  email: string;
}

const getHostContact = async (
  database: KeeperDatabase,
  userId: string,
): Promise<HostContact | null> => {
  const [row] = await database
    .select({ name: userTable.name, email: userTable.email })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);

  return row ?? null;
};

interface CancelableBooking {
  bookingId: string;
  status: string;
  userEventId: string;
  guestName: string;
  guestEmail: string;
  guestTimezone: string;
  startTime: Date;
  endTime: Date;
  cancelToken: string;
  eventTitle: string;
  eventTimezone: string;
  hostUserId: string;
  hostName: string;
  hostEmail: string;
  hostDisplayName: string;
}

/** Resolve a public cancel token to the full booking plus host/event context. */
const resolveBookingByCancelToken = async (
  database: KeeperDatabase,
  token: string,
): Promise<CancelableBooking | null> => {
  const [row] = await database
    .select({
      bookingId: bookingsTable.id,
      status: bookingsTable.status,
      userEventId: bookingsTable.userEventId,
      guestName: bookingsTable.guestName,
      guestEmail: bookingsTable.guestEmail,
      guestTimezone: bookingsTable.guestTimezone,
      startTime: bookingsTable.startTime,
      endTime: bookingsTable.endTime,
      cancelToken: bookingsTable.cancelToken,
      eventTitle: eventTypesTable.title,
      eventTimezone: eventTypesTable.timezone,
      hostUserId: eventTypesTable.userId,
      hostName: userTable.name,
      hostEmail: userTable.email,
      hostDisplayName: bookingProfilesTable.displayName,
    })
    .from(bookingsTable)
    .innerJoin(eventTypesTable, eq(bookingsTable.eventTypeId, eventTypesTable.id))
    .innerJoin(userTable, eq(eventTypesTable.userId, userTable.id))
    .innerJoin(bookingProfilesTable, eq(bookingProfilesTable.userId, eventTypesTable.userId))
    .where(eq(bookingsTable.cancelToken, token))
    .limit(1);

  return row ?? null;
};

export {
  CONFIRMED_STATUS,
  getAvailabilityRules,
  getConfirmedBookingIntervals,
  getHostContact,
  resolveBookingByCancelToken,
  resolveBookingTarget,
};
export type { CancelableBooking, HostContact, ResolvedBookingTarget, ResolvedEventType };
