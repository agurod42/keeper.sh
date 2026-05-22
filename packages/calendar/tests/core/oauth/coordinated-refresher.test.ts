import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCoordinatedRefresher } from "../../../src/core/oauth/coordinated-refresher";

describe("coordinated-refresher", () => {
  const mockDb = {
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([]),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("refreshes token and updates database", async () => {
    const rawRefresh = vi.fn().mockResolvedValue({
      access_token: "new-at",
      expires_in: 3600,
    });

    const refresher = createCoordinatedRefresher({
      database: mockDb as any,
      oauthCredentialId: "cred-1",
      calendarAccountId: "acc-1",
      refreshLockStore: null,
      rawRefresh,
    });

    const result = await refresher("rt");
    expect(result.access_token).toBe("new-at");
    expect(mockDb.update).toHaveBeenCalled();
  });
});
