import { describe, it, expect } from "vitest";
import { parseZohoEvents } from "../../../../../src/providers/zoho/source/utils/fetch-events";
import type { ZohoCalendarEvent } from "../../../../../src/providers/zoho/source/types";

describe("Zoho fetch-events utils", () => {
  describe("parseZohoEvents", () => {
    it("parses events correctly", () => {
      const mockEvents: ZohoCalendarEvent[] = [
        {
          uid: "uid-1",
          title: "Title",
          dateandtime: {
            start: "20260101T100000Z",
            end: "20260101T110000Z",
            timezone: "UTC",
          },
          estatus: "free",
        },
      ];

      const result = parseZohoEvents(mockEvents);
      expect(result).toHaveLength(1);
      expect(result[0].uid).toBe("uid-1");
      expect(result[0].availability).toBe("free");
    });

    it("skips keeper events", () => {
      const mockEvents: ZohoCalendarEvent[] = [
        {
          uid: "some-hash@keeper.sh",
          title: "Keeper Event",
          dateandtime: {
            start: "20260101T100000Z",
            end: "20260101T110000Z",
            timezone: "UTC",
          },
        },
      ];

      const result = parseZohoEvents(mockEvents);
      expect(result).toHaveLength(0);
    });
  });
});
