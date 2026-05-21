import { describe, it, expect } from "vitest";
import { canPull, canPush, getCalendarProvider } from "../../src/utils/calendars";

describe("calendars utils", () => {
  it("canPull and canPush check capabilities", () => {
    const cal = { capabilities: ["pull"], calendarType: "ical" };
    expect(canPull(cal)).toBe(true);
    expect(canPush(cal)).toBe(false);
  });

  it("getCalendarProvider returns provider or type", () => {
    expect(getCalendarProvider({ provider: "google", calendarType: "oauth" })).toBe("google");
    expect(getCalendarProvider({ provider: null, calendarType: "ical" })).toBe("ical");
  });
});
