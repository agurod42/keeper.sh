import { describe, it, expect } from "vitest";
import { parseEventDateTime, parseEventTime } from "../../../../src/providers/google/shared/date-time";

describe("Google date-time utils", () => {
  it("parseEventDateTime parses dateTime", () => {
    const d = parseEventDateTime({ dateTime: "2026-05-20T10:00:00Z" });
    expect(d.getUTCFullYear()).toBe(2026);
  });

  it("parseEventDateTime parses date", () => {
    const d = parseEventDateTime({ date: "2026-05-20" });
    expect(d.getUTCDate()).toBe(20);
  });

  it("parseEventTime returns null if undefined", () => {
    expect(parseEventTime(undefined)).toBeNull();
  });
});
