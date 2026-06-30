import { type } from "arktype";

const calendarIdsBodySchema = type({
  calendarIds: "string[]",
  "+": "reject",
});
type CalendarIdsBody = typeof calendarIdsBodySchema.infer;

const sourcePatchBodySchema = type({
  "name?": "string",
  "customEventName?": "string",
  "excludeAllDayEvents?": "boolean",
  "excludeEventDescription?": "boolean",
  "excludeEventLocation?": "boolean",
  "excludeEventName?": "boolean",
  "excludeFocusTime?": "boolean",
  "excludeOutOfOffice?": "boolean",
  "includeInIcalFeed?": "boolean",
  "+": "reject",
});
type SourcePatchBody = typeof sourcePatchBodySchema.infer;

const icalSettingsPatchBodySchema = type({
  "includeEventName?": "boolean",
  "includeEventDescription?": "boolean",
  "includeEventLocation?": "boolean",
  "includeCalendarSource?": "boolean",
  "excludeAllDayEvents?": "boolean",
  "customEventName?": "string",
  "+": "reject",
});
type IcalSettingsPatchBody = typeof icalSettingsPatchBodySchema.infer;

const eventCreateBodySchema = type({
  calendarId: "string",
  title: "string",
  "description?": "string",
  "location?": "string",
  startTime: "string",
  endTime: "string",
  "isAllDay?": "boolean",
  "availability?": "'busy' | 'free'",
  "timezone?": "string",
  "+": "reject",
});
type EventCreateBody = typeof eventCreateBodySchema.infer;

const eventPatchBodySchema = type({
  "title?": "string",
  "description?": "string",
  "location?": "string",
  "startTime?": "string",
  "endTime?": "string",
  "isAllDay?": "boolean",
  "availability?": "'busy' | 'free'",
  "timezone?": "string",
  "rsvpStatus?": "'accepted' | 'declined' | 'tentative'",
  "+": "reject",
});
type EventPatchBody = typeof eventPatchBodySchema.infer;

const tokenCreateBodySchema = type({
  name: "string",
  "+": "reject",
});
type TokenCreateBody = typeof tokenCreateBodySchema.infer;

const bookingCreateBodySchema = type({
  slotStart: "string",
  guestName: "string > 0",
  guestEmail: "string.email",
  "guestNotes?": "string",
  guestTimezone: "string > 0",
  "+": "reject",
});
type BookingCreateBody = typeof bookingCreateBodySchema.infer;

const locationType = "'none' | 'google_meet' | 'zoom' | 'phone' | 'custom'";

const eventTypeCreateBodySchema = type({
  slug: "string > 0",
  title: "string > 0",
  "description?": "string",
  durationMinutes: "number > 0",
  "bufferBeforeMinutes?": "number >= 0",
  "bufferAfterMinutes?": "number >= 0",
  "minNoticeMinutes?": "number >= 0",
  "maxAdvanceDays?": "number > 0",
  timezone: "string > 0",
  destinationCalendarId: "string > 0",
  "conflictCalendarIds?": "string[] | null",
  "locationType?": locationType,
  "locationValue?": "string | null",
  "color?": "string | null",
  "isActive?": "boolean",
  "+": "reject",
});
type EventTypeCreateBody = typeof eventTypeCreateBodySchema.infer;

const eventTypePatchBodySchema = type({
  "slug?": "string > 0",
  "title?": "string > 0",
  "description?": "string | null",
  "durationMinutes?": "number > 0",
  "bufferBeforeMinutes?": "number >= 0",
  "bufferAfterMinutes?": "number >= 0",
  "minNoticeMinutes?": "number >= 0",
  "maxAdvanceDays?": "number > 0",
  "timezone?": "string > 0",
  "destinationCalendarId?": "string > 0",
  "conflictCalendarIds?": "string[] | null",
  "locationType?": locationType,
  "locationValue?": "string | null",
  "color?": "string | null",
  "isActive?": "boolean",
  "+": "reject",
});
type EventTypePatchBody = typeof eventTypePatchBodySchema.infer;

const availabilityPutBodySchema = type({
  rules: type({
    weekday: "0 <= number.integer <= 6",
    startMinute: "0 <= number.integer <= 1440",
    endMinute: "0 <= number.integer <= 1440",
  }).array(),
  "+": "reject",
});
type AvailabilityPutBody = typeof availabilityPutBodySchema.infer;

const bookingProfilePutBodySchema = type({
  slug: "string > 0",
  displayName: "string > 0",
  "avatarUrl?": "string | null",
  "+": "reject",
});
type BookingProfilePutBody = typeof bookingProfilePutBodySchema.infer;

export {
  availabilityPutBodySchema,
  bookingCreateBodySchema,
  bookingProfilePutBodySchema,
  calendarIdsBodySchema,
  eventTypeCreateBodySchema,
  eventTypePatchBodySchema,
  sourcePatchBodySchema,
  icalSettingsPatchBodySchema,
  eventCreateBodySchema,
  eventPatchBodySchema,
  tokenCreateBodySchema,
};
export type {
  AvailabilityPutBody,
  BookingCreateBody,
  BookingProfilePutBody,
  CalendarIdsBody,
  EventTypeCreateBody,
  EventTypePatchBody,
  SourcePatchBody,
  IcalSettingsPatchBody,
  EventCreateBody,
  EventPatchBody,
  TokenCreateBody,
};
