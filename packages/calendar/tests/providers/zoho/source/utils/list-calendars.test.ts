import { describe, it, expect, vi, beforeEach } from "vitest";
import { listUserCalendars } from "../../../../../src/providers/zoho/source/utils/list-calendars";

describe("Zoho list-calendars", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn();
  });

  it("returns list of calendars", async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        calendars: [
          { uid: "cal-1", name: "My Cal" },
        ],
      }),
    };
    (globalThis.fetch as any).mockResolvedValue(mockResponse);

    const result = await listUserCalendars("at", { providerMetadata: { region: "us" } });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("My Cal");
  });

  it("throws CalendarListError on API error", async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: false,
      status: 401,
    });

    await expect(listUserCalendars("at", { providerMetadata: { region: "us" } })).rejects.toThrow("Failed to list calendars: 401");
  });
});
