import type { ZohoProviderMetadata } from "../../../core/oauth/zoho";

interface ZohoCalendarListEntry {
  uid: string;
  name?: string;
  description?: string;
  color?: string;
  owner?: string;
  caltype?: string;
  isdefault?: boolean;
  default?: boolean;
  permissions?: string;
}

interface ZohoCalendarListResponse {
  calendars?: ZohoCalendarListEntry[];
}

interface ZohoEventDateTime {
  start?: string;
  end?: string;
  timezone?: string;
}

interface ZohoCalendarEvent {
  uid: string;
  caluid?: string;
  calid?: string;
  title?: string;
  description?: string;
  location?: string;
  isallday?: boolean;
  isprivate?: boolean;
  dateandtime?: ZohoEventDateTime;
  etag?: string | number;
  etype?: string;
  estatus?: string;
  rrule?: string;
  createdtime_millis?: string | number;
  lastmodifiedtime?: string;
  viewEventURL?: string;
}

interface ZohoEventsListResponse {
  events?: ZohoCalendarEvent[];
}

interface FetchEventsOptions {
  accessToken: string;
  calendarApiBase: string;
  externalCalendarId: string;
}

interface FetchEventsResult {
  events: ZohoCalendarEvent[];
  fullSyncRequired: false;
}

interface EventTimeSlot {
  uid: string;
  startTime: Date;
  endTime: Date;
  availability?: "busy" | "free" | "oof" | "workingElsewhere";
  isAllDay?: boolean;
  startTimeZone?: string;
  title?: string;
  description?: string;
  location?: string;
}

export type {
  ZohoCalendarListEntry,
  ZohoCalendarListResponse,
  ZohoEventDateTime,
  ZohoCalendarEvent,
  ZohoEventsListResponse,
  FetchEventsOptions,
  FetchEventsResult,
  EventTimeSlot,
  ZohoProviderMetadata,
};
