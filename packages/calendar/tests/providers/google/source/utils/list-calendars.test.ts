import { describe, it, expect, vi, beforeEach } from "vitest";
import { listUserCalendars } from "../../../../../src/providers/google/source/utils/list-calendars";

describe("Google list-calendars utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn();
  });

  it("lists calendars from multiple pages", async () => {
    (globalThis.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          kind: "calendar#calendarList",
          items: [{ id: "c1", summary: "Cal 1", accessRole: "owner" }],
          nextPageToken: "next",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          kind: "calendar#calendarList",
          items: [{ id: "c2", summary: "Cal 2", accessRole: "reader" }],
        }),
      });

    const result = await listUserCalendars("at");
    expect(result).toHaveLength(2);
    expect(result[0].summary).toBe("Cal 1");
    expect(result[1].summary).toBe("Cal 2");
  });
});
