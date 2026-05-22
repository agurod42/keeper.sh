import { describe, it, expect } from "vitest";
import { serializeZohoEvent } from "../../../../src/providers/zoho/destination/serialize-event";

describe("serializeZohoEvent", () => {
  it("serializes a timed event correctly", () => {
    const event = {
      summary: "Test",
      startTime: new Date("2026-05-20T10:00:00Z"),
      endTime: new Date("2026-05-20T11:00:00Z"),
      startTimeZone: "UTC",
    } as any;

    const result = JSON.parse(serializeZohoEvent(event));
    expect(result.title).toBe("Test");
    expect(result.dateandtime.start).toBe("20260520T100000Z");
    expect(result.isallday).toBe(false);
  });

  it("serializes an all-day event correctly", () => {
    const event = {
      summary: "All Day",
      startTime: new Date("2026-05-20T00:00:00Z"),
      endTime: new Date("2026-05-21T00:00:00Z"),
      isAllDay: true,
    } as any;

    const result = JSON.parse(serializeZohoEvent(event));
    expect(result.title).toBe("All Day");
    expect(result.dateandtime.start).toBe("20260520");
    expect(result.isallday).toBe(true);
  });

  it("includes optional fields", () => {
    const event = {
      summary: "T",
      startTime: new Date(),
      endTime: new Date(),
      description: "D",
      location: "L",
    } as any;
    const result = JSON.parse(serializeZohoEvent(event));
    expect(result.description).toBe("D");
    expect(result.location).toBe("L");
  });
});
