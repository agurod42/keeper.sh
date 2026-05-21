import { describe, it, expect } from "vitest";
import { deduplicateEvents, resolveEvents } from "../../src/hooks/use-events";

describe("use-events utils", () => {
  describe("deduplicateEvents", () => {
    it("removes duplicate event IDs", () => {
      const events = [
        { id: "e1", title: "Event 1" },
        { id: "e1", title: "Event 1 copy" },
        { id: "e2", title: "Event 2" },
      ] as any;

      const result = deduplicateEvents(events);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("e1");
      expect(result[1].id).toBe("e2");
    });
  });

  describe("resolveEvents", () => {
    it("flats and deduplicates data", () => {
      const data = [
        [{ id: "e1" }, { id: "e2" }],
        [{ id: "e2" }, { id: "e3" }],
      ] as any;
      const result = resolveEvents(data);
      expect(result).toHaveLength(3);
    });

    it("returns empty array if data is undefined", () => {
      expect(resolveEvents(undefined)).toEqual([]);
    });
  });
});
