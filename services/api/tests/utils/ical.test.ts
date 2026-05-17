import { describe, expect, it } from "vitest";
import { formatEventsAsIcal } from "../../src/utils/ical-format";
import type { CalendarEvent } from "../../src/utils/ical-format";

const resolveTemplate = (template: string, variables: Record<string, string>): string =>
  template.replaceAll(/\{\{(\w+)\}\}/g, (match, name: string) => variables[name] ?? match);

interface SummaryEvent {
  title: string | null;
  calendarName: string;
}

interface SummarySettings {
  includeEventName: boolean;
  customEventName: string;
}

const resolveEventSummary = (event: SummaryEvent, settings: SummarySettings): string => {
  let template = settings.customEventName;
  if (settings.includeEventName) {
    template = event.title || settings.customEventName;
  }

  return resolveTemplate(template, {
    event_name: event.title || "Untitled",
    calendar_name: event.calendarName,
  });
};

const DEFAULT_SETTINGS = {
  includeEventName: false,
  includeEventDescription: false,
  includeEventLocation: false,
  includeCalendarSource: false,
  excludeAllDayEvents: false,
  customEventName: "Busy",
};

const makeEvent = (overrides: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id: "test-event-id",
  title: "Test Event",
  description: null,
  location: null,
  startTime: new Date("2026-03-28T00:00:00Z"),
  endTime: new Date("2026-03-29T00:00:00Z"),
  isAllDay: false,
  calendarName: "Work",
  calendarId: "calendar-1",
  calendarColor: null,
  ...overrides,
});

describe("formatEventsAsIcal", () => {
  describe("all-day events", () => {
    it("emits VALUE=DATE for all-day events instead of datetime", () => {
      const ics = formatEventsAsIcal(
        [makeEvent({ isAllDay: true })],
        DEFAULT_SETTINGS,
      );

      expect(ics).toContain("DTSTART;VALUE=DATE:20260328");
      expect(ics).toContain("DTEND;VALUE=DATE:20260329");
      expect(ics).not.toContain("DTSTART:20260328T000000Z");
      expect(ics).not.toContain("DTEND:20260329T000000Z");
    });

    it("emits datetime format for non-all-day events", () => {
      const ics = formatEventsAsIcal(
        [makeEvent({
          isAllDay: false,
          startTime: new Date("2026-03-28T09:00:00Z"),
          endTime: new Date("2026-03-28T17:00:00Z"),
        })],
        DEFAULT_SETTINGS,
      );

      expect(ics).toContain("DTSTART:20260328T090000Z");
      expect(ics).toContain("DTEND:20260328T170000Z");
    });

    it("infers all-day when isAllDay is null and times are midnight UTC", () => {
      const ics = formatEventsAsIcal(
        [makeEvent({ isAllDay: null })],
        DEFAULT_SETTINGS,
      );

      expect(ics).toContain("DTSTART;VALUE=DATE:20260328");
      expect(ics).toContain("DTEND;VALUE=DATE:20260329");
    });

    it("filters all-day events when excludeAllDayEvents is true", () => {
      const ics = formatEventsAsIcal(
        [makeEvent({ isAllDay: true })],
        { ...DEFAULT_SETTINGS, excludeAllDayEvents: true },
      );

      expect(ics).not.toContain("Test Event");
      expect(ics).not.toContain("test-event-id");
    });
  });
});

describe("resolveTemplate", () => {
  it("replaces known variables in template", () => {
    expect(resolveTemplate("{{calendar_name}}", { calendar_name: "Work" })).toBe("Work");
  });

  it("replaces multiple variables", () => {
    expect(
      resolveTemplate("{{event_name}} - {{calendar_name}}", {
        calendar_name: "Work",
        event_name: "Meeting",
      }),
    ).toBe("Meeting - Work");
  });

  it("leaves unknown tokens unchanged", () => {
    expect(resolveTemplate("{{unknown}}", {})).toBe("{{unknown}}");
  });

  it("returns template as-is when no tokens present", () => {
    expect(resolveTemplate("Busy", { calendar_name: "Work" })).toBe("Busy");
  });
});

describe("resolveEventSummary", () => {
  it("uses custom event name when includeEventName is false", () => {
    const result = resolveEventSummary(
      { title: "Team Meeting", calendarName: "Work" },
      { includeEventName: false, customEventName: "Busy" },
    );
    expect(result).toBe("Busy");
  });

  it("uses event title when includeEventName is true", () => {
    const result = resolveEventSummary(
      { title: "Team Meeting", calendarName: "Work" },
      { includeEventName: true, customEventName: "Busy" },
    );
    expect(result).toBe("Team Meeting");
  });

  it("falls back to custom event name when title is null and includeEventName is true", () => {
    const result = resolveEventSummary(
      { title: null, calendarName: "Work" },
      { includeEventName: true, customEventName: "Busy" },
    );
    expect(result).toBe("Busy");
  });

  it("resolves template variables in custom event name", () => {
    const result = resolveEventSummary(
      { title: "Sprint Planning", calendarName: "Engineering" },
      { includeEventName: false, customEventName: "{{calendar_name}}: {{event_name}}" },
    );
    expect(result).toBe("Engineering: Sprint Planning");
  });

  it("uses 'Untitled' for event_name variable when title is null", () => {
    const result = resolveEventSummary(
      { title: null, calendarName: "Work" },
      { includeEventName: false, customEventName: "{{event_name}}" },
    );
    expect(result).toBe("Untitled");
  });
});

describe("calendar source metadata", () => {
  it("does not emit categories or color when toggle is off", () => {
    const ics = formatEventsAsIcal(
      [makeEvent({ calendarId: "cal-x", calendarColor: "#4285F4" })],
      DEFAULT_SETTINGS,
    );
    expect(ics).not.toContain("CATEGORIES:");
    expect(ics).not.toContain("COLOR:");
    expect(ics).not.toContain("X-APPLE-CALENDAR-COLOR:");
  });

  it("emits CATEGORIES, COLOR, and X-APPLE-CALENDAR-COLOR when toggle is on", () => {
    const ics = formatEventsAsIcal(
      [makeEvent({ calendarName: "Work", calendarId: "cal-x", calendarColor: "#4285F4" })],
      { ...DEFAULT_SETTINGS, includeCalendarSource: true },
    );
    expect(ics).toContain("CATEGORIES:Work");
    expect(ics).toContain("COLOR:#4285F4");
    expect(ics).toContain("X-APPLE-CALENDAR-COLOR:#4285F4");
  });

  it("falls back to a deterministic palette color when calendar has no native color", () => {
    const ics = formatEventsAsIcal(
      [makeEvent({ calendarId: "deterministic-id", calendarColor: null })],
      { ...DEFAULT_SETTINGS, includeCalendarSource: true },
    );
    expect(ics).toMatch(/COLOR:#[0-9A-F]{6}/);
    expect(ics).toMatch(/X-APPLE-CALENDAR-COLOR:#[0-9A-F]{6}/);
  });

  it("emits per-event source metadata for multiple events", () => {
    const ics = formatEventsAsIcal(
      [
        makeEvent({ id: "a", calendarName: "Work", calendarId: "cal-a", calendarColor: "#FF0000" }),
        makeEvent({ id: "b", calendarName: "Personal", calendarId: "cal-b", calendarColor: "#00FF00" }),
      ],
      { ...DEFAULT_SETTINGS, includeCalendarSource: true },
    );
    expect(ics).toContain("CATEGORIES:Work");
    expect(ics).toContain("CATEGORIES:Personal");
    expect(ics).toContain("COLOR:#FF0000");
    expect(ics).toContain("COLOR:#00FF00");
  });
});
