import { describe, it, expect, vi } from "vitest";
import { getOAuthAccountsByPlan, getOAuthAccountsForUser, getUserEventsForSync } from "../../../src/core/oauth/accounts";

describe("oauth accounts", () => {
  const mockDb = {
    select: vi.fn(() => ({
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockImplementation((cb) => Promise.resolve([
        {
          id: "c1",
          plan: "pro",
          accessToken: "at",
          refreshToken: "rt",
          accessTokenExpiresAt: new Date(),
          userId: "u1",
          accountId: "acc-1",
          calendarId: "c1",
          calendarName: "Cal",
          startTime: new Date(),
        },
      ])),
      then: vi.fn().mockImplementation((cb) => Promise.resolve([
        {
          id: "c1",
          plan: "pro",
          accessToken: "at",
          refreshToken: "rt",
          accessTokenExpiresAt: new Date(),
          userId: "u1",
          accountId: "acc-1",
          calendarId: "c1",
        },
      ]).then(cb)),
    })),
  };

  it("getOAuthAccountsByPlan filters by plan", async () => {
    const result = await getOAuthAccountsByPlan(mockDb as any, "google", "pro");
    expect(result).toHaveLength(1);
  });

  it("getOAuthAccountsForUser returns user accounts", async () => {
    const result = await getOAuthAccountsForUser(mockDb as any, "u1", "google");
    expect(result).toHaveLength(1);
  });

  it("getUserEventsForSync returns user events", async () => {
    const result = await getUserEventsForSync(mockDb as any, "u1");
    expect(result).toHaveLength(1);
  });
});
