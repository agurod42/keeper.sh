import { describe, it, expect, vi, beforeEach } from "vitest";
import { listUserCalendars } from "../../../../../src/providers/outlook/source/utils/list-calendars";

describe("Outlook list-calendars utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn();
  });

  it("lists calendars from multiple pages", async () => {
    (globalThis.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          value: [{ id: "c1", name: "Cal 1" }],
          "@odata.nextLink": "https://next",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          value: [{ id: "c2", name: "Cal 2" }],
        }),
      });

    const result = await listUserCalendars("at");
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Cal 1");
    expect(result[1].name).toBe("Cal 2");
  });
});
