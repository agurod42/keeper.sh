import { afterEach, describe, expect, it, vi } from "vitest";
import type { BunSQLDatabase } from "drizzle-orm/bun-sql";
import { ZohoSourceProvider } from "../../../../src/providers/zoho/source/provider";
import type { SourceEvent, SourceSyncResult } from "../../../../src/core/types";
import type { ProcessEventsOptions } from "../../../../src/core/oauth/source-provider";

const originalFetch = globalThis.fetch;

class TestableZohoSourceProvider extends ZohoSourceProvider {
  runProcessEvents(events: SourceEvent[], options: ProcessEventsOptions): Promise<SourceSyncResult> {
    return this.processEvents(events, options);
  }
}

describe("ZohoSourceProvider", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("builds correct headers with custom Zoho prefix", () => {
    const provider = new TestableZohoSourceProvider(
      {
        accessToken: "access-token",
        accessTokenExpiresAt: new Date("2099-01-01T00:00:00.000Z"),
        calendarAccountId: "account-1",
        calendarId: "calendar-1",
        database: {} as any,
        excludeFocusTime: false,
        excludeOutOfOffice: false,
        externalCalendarId: "cal-1",
        oauthCredentialId: "cred-1",
        originalName: "My Cal",
        refreshToken: "refresh-token",
        sourceName: "Cal",
        providerMetadata: { region: "us" },
        userId: "user-1",
      },
      {
        refreshAccessToken: vi.fn(),
      }
    );

    // @ts-ignore - access protected headers
    expect(provider.headers.Authorization).toBe("Zoho-oauthtoken access-token");
  });

  it("handles event processing successfully", async () => {
    const mockDatabase = {
      delete: () => ({
        where: () => Promise.resolve(),
      }),
      select: () => ({
        from: () => ({
          where: () => Promise.resolve([]),
        }),
      }),
      update: () => ({
        set: () => ({
          where: () => Promise.resolve(),
        }),
      }),
    };

    const provider = new TestableZohoSourceProvider(
      {
        accessToken: "access-token",
        accessTokenExpiresAt: new Date("2099-01-01T00:00:00.000Z"),
        calendarAccountId: "account-1",
        calendarId: "calendar-1",
        database: mockDatabase as unknown as BunSQLDatabase,
        excludeFocusTime: false,
        excludeOutOfOffice: false,
        externalCalendarId: "cal-1",
        oauthCredentialId: "cred-1",
        originalName: "My Cal",
        refreshToken: "refresh-token",
        sourceName: "Cal",
        providerMetadata: { region: "us" },
        userId: "user-1",
      },
      {
        refreshAccessToken: vi.fn(),
      }
    );

    const result = await provider.runProcessEvents([], { isDeltaSync: false });
    expect(result.eventsAdded).toBe(0);
  });

  it("fetches events successfully", async () => {
    const mockEventsResponse = {
      events: [
        {
          uid: "uid-1",
          title: "Event 1",
          dateandtime: {
            start: "20260520T100000Z",
            end: "20260520T110000Z",
            timezone: "UTC",
          },
        },
      ],
    };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockEventsResponse,
    });

    const provider = new TestableZohoSourceProvider(
      {
        accessToken: "at",
        accessTokenExpiresAt: new Date("2099-01-01"),
        calendarAccountId: "acc-1",
        calendarId: "cal-1",
        database: {} as any,
        excludeFocusTime: false,
        excludeOutOfOffice: false,
        externalCalendarId: "ext-cal-1",
        oauthCredentialId: "cred-1",
        originalName: "My Cal",
        refreshToken: "rt",
        sourceName: "Cal",
        providerMetadata: { region: "us" },
        userId: "u1",
      },
      { refreshAccessToken: vi.fn() }
    );

    // Mock refreshOriginalName
    // @ts-ignore
    provider.refreshOriginalName = vi.fn().mockResolvedValue(undefined);

    const result = await provider.fetchEvents(null);
    expect(result.events).toHaveLength(1);
    expect(result.events[0].uid).toBe("uid-1");
  });

  it("refreshes original name successfully", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        calendar: { name: "Updated Name" },
      }),
    });

    const provider = new TestableZohoSourceProvider(
      {
        accessToken: "at",
        accessTokenExpiresAt: new Date("2099-01-01"),
        calendarAccountId: "acc-1",
        calendarId: "cal-1",
        database: {
          update: () => ({
            set: () => ({
              where: () => Promise.resolve(),
            }),
          }),
        } as any,
        excludeFocusTime: false,
        excludeOutOfOffice: false,
        externalCalendarId: "ext-cal-1",
        oauthCredentialId: "cred-1",
        originalName: "Old Name",
        refreshToken: "rt",
        sourceName: "Cal",
        providerMetadata: { region: "us" },
        userId: "u1",
      },
      { refreshAccessToken: vi.fn() }
    );

    // @ts-ignore
    await provider.refreshOriginalName();
    expect(globalThis.fetch).toHaveBeenCalled();
  });
});
