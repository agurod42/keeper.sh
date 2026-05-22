import { describe, it, expect, vi, beforeEach } from "vitest";
import { createGoogleCalendarSourceProvider } from "../../../../src/providers/google/source/provider";

vi.mock("../../../../src/core/oauth/create-source-provider", () => ({
  createOAuthSourceProvider: vi.fn((config) => ({
    syncAllSources: async () => {
      const sources = await config.getAllSources(config.database);
      return { added: sources.length };
    }
  })),
}));

describe("createGoogleCalendarSourceProvider", () => {
  it("creates a source provider that can sync", async () => {
    const mockDb = {
      select: vi.fn(() => ({
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ externalCalendarId: "ext-1", provider: "google" }]),
      })),
    };

    const provider = createGoogleCalendarSourceProvider({
      database: mockDb as any,
      oauthProvider: {} as any,
    });

    const result = await provider.syncAllSources();
    expect(result.added).toBe(1);
  });
});
