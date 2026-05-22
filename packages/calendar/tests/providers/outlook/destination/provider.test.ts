import { describe, it, expect, vi, beforeEach } from "vitest";
import { createOutlookSyncProvider } from "../../../../src/providers/outlook/destination/provider";

describe("createOutlookSyncProvider", () => {
  const mockConfig = {
    accessToken: "at",
    refreshToken: "rt",
    accessTokenExpiresAt: new Date("2099-01-01"),
    externalCalendarId: "cal-1",
    calendarId: "c1",
    userId: "u1",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn();
  });

  it("returns an object with expected methods", () => {
    const provider = createOutlookSyncProvider(mockConfig);
    expect(provider.pushEvents).toBeInstanceOf(Function);
    expect(provider.deleteEvents).toBeInstanceOf(Function);
    expect(provider.listRemoteEvents).toBeInstanceOf(Function);
  });

  describe("listRemoteEvents", () => {
    it("fetches and parses events", async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          value: [
            {
              id: "o1",
              iCalUId: "uid-1@keeper.sh",
              start: { dateTime: "2026-05-20T10:00:00Z", timeZone: "UTC" },
              end: { dateTime: "2026-05-20T11:00:00Z", timeZone: "UTC" },
            },
          ],
        }),
      };
      (globalThis.fetch as any).mockResolvedValue(mockResponse);

      const provider = createOutlookSyncProvider(mockConfig);
      const events = await provider.listRemoteEvents();

      expect(events).toHaveLength(1);
      expect(events[0].uid).toBe("uid-1@keeper.sh");
    });
  });

  describe("pushEvents", () => {
    it("calls fetch with POST", async () => {
      (globalThis.fetch as any).mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ id: "new-o1" }),
      });

      const provider = createOutlookSyncProvider(mockConfig);
      const events = [{ id: "e1", summary: "Test", startTime: new Date(), endTime: new Date() }];
      const results = await provider.pushEvents(events as any);

      expect(results[0].success).toBe(true);
      expect(globalThis.fetch).toHaveBeenCalled();
      const call = (globalThis.fetch as any).mock.calls[0];
      const url = String(call[0]);
      const init = call[1];
      expect(url).toContain("/events");
      expect(init.method).toBe("POST");
    });
  });

  describe("deleteEvents", () => {
    it("calls fetch with DELETE", async () => {
      (globalThis.fetch as any).mockResolvedValue({
        ok: true,
        status: 204,
      });

      const provider = createOutlookSyncProvider(mockConfig);
      const results = await provider.deleteEvents(["uid-1@keeper.sh"]);

      expect(results[0].success).toBe(true);
      expect(globalThis.fetch).toHaveBeenCalled();
      const call = (globalThis.fetch as any).mock.calls[0];
      const url = String(call[0]);
      const init = call[1];
      expect(url).toContain("uid-1@keeper.sh");
      expect(init.method).toBe("DELETE");
    });
  });
});
