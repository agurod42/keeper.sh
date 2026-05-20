import { describe, it, expect, vi, beforeEach } from "vitest";
import { createZohoSourceFetcher } from "../../../../src/providers/zoho/source/fetch-adapter";

describe("Zoho fetch-adapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn();
  });

  it("returns a fetcher with fetchEvents method", async () => {
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

    const fetcher = createZohoSourceFetcher({
      accessToken: "at",
      externalCalendarId: "cal-1",
      providerMetadata: { region: "us" },
    });

    const result = await fetcher.fetchEvents();
    expect(result.events).toHaveLength(1);
    expect(result.isDeltaSync).toBe(false);
  });
});
