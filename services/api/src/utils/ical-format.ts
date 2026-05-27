import { KEEPER_EVENT_SUFFIX } from "@keeper.sh/constants";
import { resolveIsAllDayEvent } from "@keeper.sh/calendar";
import { generateIcsCalendar } from "ts-ics";
import type { IcsCalendar, IcsEvent, IcsRecurrenceRule, IcsDateObject } from "ts-ics";
import { resolveSourceColor } from "./ical-source-color";

interface FeedSettings {
  includeEventName: boolean;
  includeEventDescription: boolean;
  includeEventLocation: boolean;
  includeCalendarSource: boolean;
  excludeAllDayEvents: boolean;
  customEventName: string;
}

interface CalendarEvent {
  id: string;
  title: string | null;
  description: string | null;
  location: string | null;
  startTime: Date;
  endTime: Date;
  isAllDay: boolean | null;
  calendarName: string;
  calendarId: string;
  calendarColor: string | null;
  recurrenceRule: IcsRecurrenceRule | null;
  exceptionDates: IcsDateObject[] | null;
  recurrenceId: Date | null;
  sourceEventUid: string | null;
}

// The feed emits DTSTART/DTEND as bare UTC ("...Z"). Per RFC 5545, EXDATE and
// RRULE UNTIL must use the same value type as DTSTART, so they must be UTC too.
// Source-parsed dates can carry a TZID (the `local` block); strict clients like
// Apple Calendar drop the whole recurring event when EXDATE has an IANA TZID but
// DTSTART is UTC. Strip `local` so these serialize as UTC, preserving the instant.
// All-day exceptions (VALUE=DATE) keep their date-only type.
const toUtcDateObject = (value: IcsDateObject): IcsDateObject => {
  if (value.type === "DATE") {
    return { date: value.date, type: "DATE" };
  }
  return { date: value.date };
};

const normalizeRecurrenceRuleToUtc = (rule: IcsRecurrenceRule): IcsRecurrenceRule => {
  if (!rule.until) {
    return rule;
  }
  return { ...rule, until: toUtcDateObject(rule.until) };
};

const toAllDayShape = (event: CalendarEvent) => ({
  startTime: event.startTime,
  endTime: event.endTime,
  ...(event.isAllDay !== null && { isAllDay: event.isAllDay }),
});

const resolveTemplate = (template: string, variables: Record<string, string>): string =>
  template.replaceAll(/\{\{(\w+)\}\}/g, (match, name) => variables[name] ?? match);

const resolveEventSummary = (event: CalendarEvent, settings: FeedSettings): string => {
  let template = settings.customEventName;

  if (settings.includeEventName) {
    template = event.title || settings.customEventName;
  }

  return resolveTemplate(template, {
    event_name: event.title || "Untitled",
    calendar_name: event.calendarName,
  });
};

const injectSourceColors = (ics: string, colorByUid: Map<string, string>): string => {
  if (colorByUid.size === 0) {
    return ics;
  }
  const lineBreak = ics.includes("\r\n") ? "\r\n" : "\n";
  const lines = ics.split(lineBreak);
  const out: string[] = [];
  let currentUid: string | null = null;
  for (const line of lines) {
    out.push(line);
    if (line.startsWith("UID:")) {
      currentUid = line.slice("UID:".length);
    } else if (line === "END:VEVENT" && currentUid !== null) {
      const color = colorByUid.get(currentUid);
      if (color) {
        // Insert COLOR + X-APPLE-CALENDAR-COLOR just before END:VEVENT.
        out.splice(out.length - 1, 0, `COLOR:${color}`);
        out.splice(out.length - 1, 0, `X-APPLE-CALENDAR-COLOR:${color}`);
      }
      currentUid = null;
    }
  }
  return out.join(lineBreak);
};

/**
 * Group rows by (calendarId, sourceEventUid) so we can emit a recurring master
 * with its modified-occurrence overrides under a single UID. Within a group,
 * the master is the row with `recurrenceRule != null` and `recurrenceId == null`;
 * the rest are overrides that need `RECURRENCE-ID` linking back to the master.
 *
 * Returns groups where the FIRST element is the master (or, if no master,
 * the only/first row), and the rest are overrides.
 */
const groupRecurringEvents = (events: CalendarEvent[]): CalendarEvent[][] => {
  const groups = new Map<string, CalendarEvent[]>();
  const singletons: CalendarEvent[][] = [];

  for (const event of events) {
    if (!event.sourceEventUid) {
      // Rows without a sourceEventUid can't be reliably linked.
      singletons.push([event]);
      continue;
    }
    const key = `${event.calendarId}::${event.sourceEventUid}`;
    const existing = groups.get(key);
    if (existing) {
      existing.push(event);
    } else {
      groups.set(key, [event]);
    }
  }

  const result: CalendarEvent[][] = [];
  for (const group of groups.values()) {
    if (group.length === 1) {
      result.push(group);
      continue;
    }
    // Sort so master comes first.
    const masterIdx = group.findIndex((e) => e.recurrenceRule !== null && e.recurrenceId === null);
    if (masterIdx > 0) {
      const [master] = group.splice(masterIdx, 1);
      group.unshift(master);
    }
    result.push(group);
  }
  return [...result, ...singletons];
};

const buildBaseIcsEvent = (event: CalendarEvent, uid: string, settings: FeedSettings): IcsEvent => {
  const isAllDay = resolveIsAllDayEvent(toAllDayShape(event));
  const icsEvent: IcsEvent = {
    end: { date: event.endTime, ...(isAllDay && { type: "DATE" as const }) },
    stamp: { date: new Date() },
    start: { date: event.startTime, ...(isAllDay && { type: "DATE" as const }) },
    summary: resolveEventSummary(event, settings),
    uid,
  };

  if (settings.includeEventDescription && event.description) {
    icsEvent.description = event.description;
  }

  if (settings.includeEventLocation && event.location) {
    icsEvent.location = event.location;
  }

  if (settings.includeCalendarSource) {
    icsEvent.categories = [event.calendarName];
  }

  return icsEvent;
};

const formatEventsAsIcal = (events: CalendarEvent[], settings: FeedSettings): string => {
  const filteredEvents = events.filter((event) => {
    if (!settings.excludeAllDayEvents) {
      return true;
    }
    return !resolveIsAllDayEvent(toAllDayShape(event));
  });

  const colorByUid = new Map<string, string>();
  const icsEvents: IcsEvent[] = [];

  for (const group of groupRecurringEvents(filteredEvents)) {
    const master = group[0]!;
    const uid = `${master.id}${KEEPER_EVENT_SUFFIX}`;
    const color = settings.includeCalendarSource
      ? resolveSourceColor({ calendarId: master.calendarId, nativeColor: master.calendarColor })
      : null;

    for (const event of group) {
      // Overrides reuse the master's UID; the master itself uses its own.
      const ics = buildBaseIcsEvent(event, uid, settings);
      if (event !== master && event.recurrenceId) {
        // ts-ics shape: { value: { date: Date } } → serializes as RECURRENCE-ID.
        ics.recurrenceId = { value: { date: event.recurrenceId } };
      }
      if (event.recurrenceRule && !event.recurrenceId) {
        ics.recurrenceRule = normalizeRecurrenceRuleToUtc(event.recurrenceRule);
      }
      if (event.exceptionDates && event.exceptionDates.length > 0 && !event.recurrenceId) {
        ics.exceptionDates = event.exceptionDates.map(toUtcDateObject);
      }
      icsEvents.push(ics);
    }

    if (color) {
      colorByUid.set(uid, color);
    }
  }

  const calendar: IcsCalendar = {
    events: icsEvents,
    prodId: "-//Keeper//Keeper Calendar//EN",
    version: "2.0",
  };

  const generated = generateIcsCalendar(calendar);
  return settings.includeCalendarSource ? injectSourceColors(generated, colorByUid) : generated;
};

export { formatEventsAsIcal };
export type { CalendarEvent, FeedSettings };
