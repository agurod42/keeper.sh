import {
  availabilityRulesTable,
  bookingProfilesTable,
  bookingsTable,
  calendarsTable,
  eventTypesTable,
} from "@keeper.sh/database/schema";
import { and, desc, eq } from "drizzle-orm";

import type { AvailabilityRule } from "@/utils/booking-slots";
import type {
  BookingProfilePutBody,
  EventTypeCreateBody,
  EventTypePatchBody,
} from "@/utils/request-body";
import type { KeeperDatabase } from "@/types";

type EventType = typeof eventTypesTable.$inferSelect;
type BookingProfile = typeof bookingProfilesTable.$inferSelect;

const ONE_ROW = 1;

const userOwnsCalendar = async (
  database: KeeperDatabase,
  userId: string,
  calendarId: string,
): Promise<boolean> => {
  const [row] = await database
    .select({ id: calendarsTable.id })
    .from(calendarsTable)
    .where(and(eq(calendarsTable.id, calendarId), eq(calendarsTable.userId, userId)))
    .limit(ONE_ROW);

  return Boolean(row);
};

const listEventTypes = (database: KeeperDatabase, userId: string): Promise<EventType[]> =>
  database
    .select()
    .from(eventTypesTable)
    .where(eq(eventTypesTable.userId, userId))
    .orderBy(desc(eventTypesTable.createdAt));

const getEventType = async (
  database: KeeperDatabase,
  userId: string,
  id: string,
): Promise<EventType | null> => {
  const [row] = await database
    .select()
    .from(eventTypesTable)
    .where(and(eq(eventTypesTable.id, id), eq(eventTypesTable.userId, userId)))
    .limit(ONE_ROW);

  return row ?? null;
};

/** Insert an event type, returning null when the `(userId, slug)` pair is taken. */
const createEventType = async (
  database: KeeperDatabase,
  userId: string,
  body: EventTypeCreateBody,
): Promise<EventType | null> => {
  const [row] = await database
    .insert(eventTypesTable)
    .values({
      userId,
      slug: body.slug,
      title: body.title,
      description: body.description ?? null,
      durationMinutes: body.durationMinutes,
      bufferBeforeMinutes: body.bufferBeforeMinutes ?? 0,
      bufferAfterMinutes: body.bufferAfterMinutes ?? 0,
      minNoticeMinutes: body.minNoticeMinutes ?? 0,
      maxAdvanceDays: body.maxAdvanceDays ?? 60,
      maxBookingsPerDay: body.maxBookingsPerDay ?? null,
      timezone: body.timezone,
      destinationCalendarId: body.destinationCalendarId,
      conflictCalendarIds: body.conflictCalendarIds ?? null,
      locationType: body.locationType ?? "none",
      locationValue: body.locationValue ?? null,
      color: body.color ?? null,
      isActive: body.isActive ?? true,
    })
    .onConflictDoNothing()
    .returning();

  return row ?? null;
};

/** Update an owned event type, returning null when it is missing or slug-conflicts. */
const updateEventType = async (
  database: KeeperDatabase,
  userId: string,
  id: string,
  patch: EventTypePatchBody,
): Promise<EventType | null> => {
  const [row] = await database
    .update(eventTypesTable)
    .set(patch)
    .where(and(eq(eventTypesTable.id, id), eq(eventTypesTable.userId, userId)))
    .returning();

  return row ?? null;
};

const deleteEventType = async (
  database: KeeperDatabase,
  userId: string,
  id: string,
): Promise<boolean> => {
  const deleted = await database
    .delete(eventTypesTable)
    .where(and(eq(eventTypesTable.id, id), eq(eventTypesTable.userId, userId)))
    .returning({ id: eventTypesTable.id });

  return deleted.length === ONE_ROW;
};

/** Replace an event type's weekly availability rules atomically. */
const replaceAvailabilityRules = (
  database: KeeperDatabase,
  eventTypeId: string,
  rules: AvailabilityRule[],
): Promise<void> =>
  database.transaction(async (tx) => {
    await tx
      .delete(availabilityRulesTable)
      .where(eq(availabilityRulesTable.eventTypeId, eventTypeId));

    if (rules.length > 0) {
      await tx.insert(availabilityRulesTable).values(
        rules.map((rule) => ({
          eventTypeId,
          weekday: rule.weekday,
          startMinute: rule.startMinute,
          endMinute: rule.endMinute,
        })),
      );
    }
  });

interface HostBooking {
  id: string;
  eventTypeTitle: string;
  guestName: string;
  guestEmail: string;
  guestTimezone: string;
  startTime: Date;
  endTime: Date;
  status: string;
  createdAt: Date;
}

const listHostBookings = (database: KeeperDatabase, userId: string): Promise<HostBooking[]> =>
  database
    .select({
      id: bookingsTable.id,
      eventTypeTitle: eventTypesTable.title,
      guestName: bookingsTable.guestName,
      guestEmail: bookingsTable.guestEmail,
      guestTimezone: bookingsTable.guestTimezone,
      startTime: bookingsTable.startTime,
      endTime: bookingsTable.endTime,
      status: bookingsTable.status,
      createdAt: bookingsTable.createdAt,
    })
    .from(bookingsTable)
    .innerJoin(eventTypesTable, eq(bookingsTable.eventTypeId, eventTypesTable.id))
    .where(eq(eventTypesTable.userId, userId))
    .orderBy(desc(bookingsTable.startTime));

const getBookingProfile = async (
  database: KeeperDatabase,
  userId: string,
): Promise<BookingProfile | null> => {
  const [row] = await database
    .select()
    .from(bookingProfilesTable)
    .where(eq(bookingProfilesTable.userId, userId))
    .limit(ONE_ROW);

  return row ?? null;
};

/** Claim or update the caller's public profile, returning null on slug collision. */
const upsertBookingProfile = async (
  database: KeeperDatabase,
  userId: string,
  body: BookingProfilePutBody,
): Promise<BookingProfile | null> => {
  const [slugOwner] = await database
    .select({ userId: bookingProfilesTable.userId })
    .from(bookingProfilesTable)
    .where(eq(bookingProfilesTable.slug, body.slug))
    .limit(ONE_ROW);

  if (slugOwner && slugOwner.userId !== userId) {
    return null;
  }

  const [row] = await database
    .insert(bookingProfilesTable)
    .values({
      userId,
      slug: body.slug,
      displayName: body.displayName,
      avatarUrl: body.avatarUrl ?? null,
    })
    .onConflictDoUpdate({
      target: bookingProfilesTable.userId,
      set: {
        slug: body.slug,
        displayName: body.displayName,
        avatarUrl: body.avatarUrl ?? null,
      },
    })
    .returning();

  return row ?? null;
};

export {
  createEventType,
  deleteEventType,
  getBookingProfile,
  getEventType,
  listEventTypes,
  listHostBookings,
  replaceAvailabilityRules,
  updateEventType,
  upsertBookingProfile,
  userOwnsCalendar,
};
export type { BookingProfile, EventType, HostBooking };
