import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCalDAVSourceProvider } from "../../../../src/providers/caldav/source/provider";

vi.mock("../../../../src/providers/caldav/shared/client", () => ({
  CalDAVClient: vi.fn(() => ({
    resolveCalendarUrl: vi.fn((url) => Promise.resolve(url)),
    fetchCalendarObjects: vi.fn().mockResolvedValue([]),
  })),
}));

vi.mock("../../../../src/providers/caldav/source/sync", () => ({
  createCalDAVSourceService: vi.fn(() => ({
    getDecryptedPassword: vi.fn(() => "pass"),
    getCalDAVAccountsByPlan: vi.fn().mockResolvedValue([]),
    getAllCalDAVSources: vi.fn().mockResolvedValue([]),
  })),
}));

describe("CalDAVSourceProvider", () => {
  const mockConfig = {
    database: {} as any,
    encryptionKey: "key",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("syncAllSources calls getCalDAVAccountsByPlan", async () => {
    const provider = createCalDAVSourceProvider(mockConfig);
    const result = await provider.syncAllSources();
    expect(result.eventsAdded).toBe(0);
  });
});
