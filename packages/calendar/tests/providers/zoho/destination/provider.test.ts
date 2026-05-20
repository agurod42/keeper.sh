import { describe, it, expect, vi, beforeEach } from "vitest";
import { createZohoSyncProvider } from "../../../../src/providers/zoho/destination/provider";

describe("createZohoSyncProvider", () => {
  const mockConfig = {
    accessToken: "at",
    refreshToken: "rt",
    accessTokenExpiresAt: new Date("2099-01-01"),
    externalCalendarId: "cal-1",
    calendarId: "c1",
    userId: "u1",
    providerMetadata: { region: "us" },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn();
  });

  it("returns an object with expected methods", () => {
    const provider = createZohoSyncProvider(mockConfig);
    expect(provider.pushEvents).toBeInstanceOf(Function);
    expect(provider.deleteEvents).toBeInstanceOf(Function);
    expect(provider.listRemoteEvents).toBeInstanceOf(Function);
  });

  describe("listRemoteEvents", () => {
    it("fetches and parses events", async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          events: [
            {
              uid: "uid-1",
              dateandtime: {
                start: "20260520T100000Z",
                end: "20260520T110000Z",
              },
            },
          ],
        }),
      };
      (globalThis.fetch as any).mockResolvedValue(mockResponse);

      const provider = createZohoSyncProvider(mockConfig);
      const events = await provider.listRemoteEvents();

      expect(events).toHaveLength(1);
      expect(events[0].uid).toBe("uid-1");
    });
  });
});
