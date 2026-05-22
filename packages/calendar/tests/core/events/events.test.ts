import { describe, it, expect, vi } from "vitest";
import { shouldExcludeSyncEvent, getEventsForDestination } from "../../../src/core/events/events";

describe("events core utils", () => {
  describe("shouldExcludeSyncEvent", () => {
    it("excludes working location events", () => {
      const event = {
        excludeAllDayEvents: false,
        excludeFocusTime: false,
        excludeOutOfOffice: false,
        availability: "workingElsewhere",
        isAllDay: false,
        sourceEventType: null,
      };
      expect(shouldExcludeSyncEvent(event)).toBe(true);
    });

    it("excludes focus time if configured", () => {
      const event = {
        excludeAllDayEvents: false,
        excludeFocusTime: true,
        excludeOutOfOffice: false,
        availability: "busy",
        isAllDay: false,
        sourceEventType: "focusTime",
      };
      expect(shouldExcludeSyncEvent(event)).toBe(true);
    });

    it("includes normal events", () => {
      const event = {
        excludeAllDayEvents: false,
        excludeFocusTime: false,
        excludeOutOfOffice: false,
        availability: "busy",
        isAllDay: false,
        sourceEventType: "default",
      };
      expect(shouldExcludeSyncEvent(event)).toBe(false);
    });
  });

  describe("getEventsForDestination", () => {
    it("returns empty array if no sources", async () => {
      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue([]),
        })),
      };
      const result = await getEventsForDestination(mockDb as any, "c1");
      expect(result).toEqual([]);
    });
  });
});
