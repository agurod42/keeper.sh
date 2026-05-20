import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveCredentialsByCalendarId, resolveCredentialsByUserEventId, resolveCredentialsByEventId, resolveAllSourceCredentials } from "../../src/mutations/resolve-credentials";

const mockDatabase = {
  select: vi.fn(),
} as any;

describe("resolve-credentials", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("resolveCredentialsByCalendarId", () => {
    it("returns credentials when found and not needing reauth", async () => {
      const mockRow = {
        calendarId: "cal-1",
        accountId: "acc-1",
        provider: "google",
        needsReauthentication: false,
        oauthCredentialId: "oauth-1",
        oauthAccessToken: "at",
        oauthRefreshToken: "rt",
        oauthExpiresAt: new Date(),
      };
      
      const mockQuery = {
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockRow]),
      };
      mockDatabase.select.mockReturnValue(mockQuery);

      const result = await resolveCredentialsByCalendarId(mockDatabase, "user-1", "cal-1");

      expect(result).not.toBeNull();
      expect(result?.calendarId).toBe("cal-1");
      expect(result?.oauth).toBeDefined();
    });

    it("returns null when needs reauthentication", async () => {
      const mockRow = {
        needsReauthentication: true,
      };
      
      const mockQuery = {
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockRow]),
      };
      mockDatabase.select.mockReturnValue(mockQuery);

      const result = await resolveCredentialsByCalendarId(mockDatabase, "user-1", "cal-1");

      expect(result).toBeNull();
    });
  });

  describe("resolveCredentialsByEventId", () => {
    it("tries user events first, then synced events", async () => {
      // Mock user event not found
      const mockUserQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };
      // Mock synced event found
      const mockSyncedRow = {
        calendarId: "cal-2",
        sourceEventUid: "uid-2",
      };
      const mockSyncedQuery = {
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockSyncedRow]),
      };
      
      mockDatabase.select.mockReturnValueOnce(mockUserQuery).mockReturnValueOnce(mockSyncedQuery);

      // Mock resolveCredentialsByCalendarId called internally
      const mockCalRow = {
        calendarId: "cal-2",
        accountId: "acc-2",
        provider: "outlook",
        needsReauthentication: false,
      };
      const mockCalQuery = {
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockCalRow]),
      };
      mockDatabase.select.mockReturnValueOnce(mockCalQuery);

      const result = await resolveCredentialsByEventId(mockDatabase, "user-1", "event-2");

      expect(result).not.toBeNull();
      expect(result?.eventSource).toBe("synced");
      expect(result?.credentials.calendarId).toBe("cal-2");
    });
  });

  describe("resolveAllSourceCredentials", () => {
    it("returns all pull-capable credentials", async () => {
      const mockRows = [
        { calendarId: "cal-1", provider: "google", needsReauthentication: false },
        { calendarId: "cal-2", provider: "outlook", needsReauthentication: false },
      ];
      const mockQuery = {
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(mockRows),
      };
      mockDatabase.select.mockReturnValue(mockQuery);

      const results = await resolveAllSourceCredentials(mockDatabase, "user-1");

      expect(results).toHaveLength(2);
      expect(results[0].calendarId).toBe("cal-1");
    });
  });
});
