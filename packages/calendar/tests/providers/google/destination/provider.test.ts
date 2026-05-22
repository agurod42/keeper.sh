import { describe, it, expect, vi, beforeEach } from "vitest";
import { createGoogleSyncProvider } from "../../../../src/providers/google/destination/provider";

const { mockExecuteBatchChunked } = vi.hoisted(() => ({
  mockExecuteBatchChunked: vi.fn(),
}));

vi.mock("../../../../src/providers/google/shared/batch", () => ({
  executeBatchChunked: mockExecuteBatchChunked,
}));

describe("createGoogleSyncProvider", () => {
  const config = {
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

  it("returns a provider with expected methods", () => {
    const provider = createGoogleSyncProvider(config);
    expect(provider.pushEvents).toBeInstanceOf(Function);
  });

  describe("listRemoteEvents", () => {
    it("fetches and parses events", async () => {
      (globalThis.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          kind: "calendar#events",
          items: [
            {
              id: "g1",
              iCalUID: "uid-1@keeper.sh",
              start: { dateTime: "2026-05-20T10:00:00Z" },
              end: { dateTime: "2026-05-20T11:00:00Z" },
            },
          ],
        }),
      });

      const provider = createGoogleSyncProvider(config);
      const events = await provider.listRemoteEvents();

      expect(events).toHaveLength(1);
      expect(events[0].uid).toBe("uid-1@keeper.sh");
    });
  });

  describe("pushEvents", () => {
    it("calls batch execute", async () => {
      mockExecuteBatchChunked.mockResolvedValue([{ statusCode: 200, body: { id: "new-g1" } }]);

      const provider = createGoogleSyncProvider(config);
      const events = [{ 
        id: "e1", 
        summary: "Test", 
        startTime: new Date(), 
        endTime: new Date(),
        availability: "busy"
      }];
      const results = await provider.pushEvents(events as any);

      expect(results[0].success).toBe(true);
      expect(mockExecuteBatchChunked).toHaveBeenCalled();
    });
  });

  describe("deleteEvents", () => {
    it("calls batch execute for deletes", async () => {
      mockExecuteBatchChunked.mockResolvedValue([{ statusCode: 204 }]);

      const provider = createGoogleSyncProvider(config);
      const results = await provider.deleteEvents(["uid-1@keeper.sh"]);

      expect(results[0].success).toBe(true);
      expect(mockExecuteBatchChunked).toHaveBeenCalled();
    });
  });

  describe("listRemoteEvents", () => {
    it("fetches multiple pages", async () => {
      (globalThis.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            kind: "calendar#events",
            items: [{ id: "g1", iCalUID: "u1@keeper.sh", start: { dateTime: "2026-05-20T10:00:00Z" }, end: { dateTime: "2026-05-20T11:00:00Z" } }],
            nextPageToken: "next",
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            kind: "calendar#events",
            items: [{ id: "g2", iCalUID: "u2@keeper.sh", start: { dateTime: "2026-05-20T12:00:00Z" }, end: { dateTime: "2026-05-20T13:00:00Z" } }],
          }),
        });

      const provider = createGoogleSyncProvider(config);
      const events = await provider.listRemoteEvents();

      expect(events).toHaveLength(2);
    });
  });
});
