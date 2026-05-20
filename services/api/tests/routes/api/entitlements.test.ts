import { describe, it, expect, vi } from "vitest";

const { mockDatabase, mockPremiumService } = vi.hoisted(() => ({
  mockDatabase: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn().mockResolvedValue([{ id: "acc-1" }]),
      })),
    })),
  },
  mockPremiumService: {
    getUserPlan: vi.fn(),
    getAccountLimit: vi.fn(),
    getMappingLimit: vi.fn(),
  },
}));

vi.mock("@/utils/middleware", () => ({
  withAuth: (handler: any) => handler,
  withWideEvent: (handler: any) => handler,
}));

vi.mock("@/context", () => ({
  database: mockDatabase,
  premiumService: mockPremiumService,
}));

vi.mock("@/utils/source-destination-mappings", () => ({
  getUserMappings: vi.fn().mockResolvedValue([{ id: "map-1" }]),
}));

import { GET } from "@/routes/api/entitlements";

describe("entitlements route", () => {
  it("returns user entitlements", async () => {
    mockPremiumService.getUserPlan.mockResolvedValue("free");
    mockPremiumService.getAccountLimit.mockReturnValue(5);
    mockPremiumService.getMappingLimit.mockReturnValue(10);

    const response = await GET({ userId: "user-1" } as any);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      accounts: { current: 1, limit: 5 },
      canUseEventFilters: false,
      canCustomizeIcalFeed: false,
      mappings: { current: 1, limit: 10 },
      plan: "free",
    });
  });
});
