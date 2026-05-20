import { describe, it, expect } from "vitest";
import { parseZohoBasicDateTime, formatZohoBasicDateTime } from "../../../../src/providers/zoho/shared/date-time";

describe("Zoho date-time utils", () => {
  describe("parseZohoBasicDateTime", () => {
    it("parses UTC format YYYYMMDDTHHMMSSZ", () => {
      const date = parseZohoBasicDateTime("20260101T100000Z");
      expect(date.getUTCFullYear()).toBe(2026);
      expect(date.getUTCMonth()).toBe(0);
      expect(date.getUTCDate()).toBe(1);
      expect(date.getUTCHours()).toBe(10);
    });

    it("parses date-only format YYYYMMDD", () => {
      const date = parseZohoBasicDateTime("20260101");
      expect(date.getUTCFullYear()).toBe(2026);
      expect(date.getUTCMonth()).toBe(0);
      expect(date.getUTCDate()).toBe(1);
      expect(date.getUTCHours()).toBe(0);
    });
  });

  describe("formatZohoBasicDateTime", () => {
    it("formats to basic ISO UTC", () => {
      const date = new Date(Date.UTC(2026, 0, 1, 10, 0, 0));
      expect(formatZohoBasicDateTime(date, "UTC")).toBe("20260101T100000Z");
    });
  });
});
