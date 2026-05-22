import { describe, it, expect } from "vitest";
import { parseEventDateTime, parseEventTime } from "../../../../src/providers/outlook/shared/date-time";

describe("Outlook date-time utils", () => {
  it("parseEventDateTime handles UTC without Z", () => {
    const d = parseEventDateTime({ dateTime: "2026-05-20T10:00:00", timeZone: "UTC" });
    expect(d.getUTCHours()).toBe(10);
  });

  it("parseEventDateTime handles Z", () => {
    const d = parseEventDateTime({ dateTime: "2026-05-20T10:00:00Z", timeZone: "UTC" });
    expect(d.getUTCHours()).toBe(10);
  });

  it("parseEventTime returns null if undefined", () => {
    expect(parseEventTime(undefined)).toBeNull();
  });
});
