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
}

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

const formatEventsAsIcal = (events: CalendarEvent[], settings: FeedSettings): string => {
  const filteredEvents = events.filter((event) => {
    if (!settings.excludeAllDayEvents) {
      return true;
    }
    return !resolveIsAllDayEvent(toAllDayShape(event));
  });

  const colorByUid = new Map<string, string>();

  const icsEvents: IcsEvent[] = filteredEvents.map((event) => {
    const isAllDay = resolveIsAllDayEvent(toAllDayShape(event));
    const uid = `${event.id}${KEEPER_EVENT_SUFFIX}`;
    const icsEvent: IcsEvent = {
      end: { date: event.endTime, ...(isAllDay && { type: "DATE" as const }) },
      stamp: { date: new Date() },
      start: { date: event.startTime, ...(isAllDay && { type: "DATE" as const }) },
      summary: resolveEventSummary(event, settings),
      uid,
    };

    if (event.recurrenceRule) {
      icsEvent.recurrenceRule = event.recurrenceRule;
    }

    if (event.exceptionDates && event.exceptionDates.length > 0) {
      icsEvent.exceptionDates = event.exceptionDates;
    }

    if (settings.includeEventDescription && event.description) {
      icsEvent.description = event.description;
    }

    if (settings.includeEventLocation && event.location) {
      icsEvent.location = event.location;
    }

    if (settings.includeCalendarSource) {
      icsEvent.categories = [event.calendarName];
      colorByUid.set(
        uid,
        resolveSourceColor({ calendarId: event.calendarId, nativeColor: event.calendarColor }),
      );
    }

    return icsEvent;
  });

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
