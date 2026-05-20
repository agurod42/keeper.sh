import { describe, it, expect, vi } from "vitest";

const { mockKeeperApi } = vi.hoisted(() => ({
  mockKeeperApi: {
    listDestinations: vi.fn(),
  },
}));

vi.mock("@/utils/middleware", () => ({
  withAuth: (handler: any) => handler,
  withWideEvent: (handler: any) => handler,
}));

vi.mock("@/context", () => ({
  database: {},
}));

vi.mock("@/read-models", () => ({
  createKeeperApi: vi.fn(() => mockKeeperApi),
}));

import { GET } from "@/routes/api/destinations/index";

describe("destinations list route", () => {
  it("returns list of destinations", async () => {
    mockKeeperApi.listDestinations.mockResolvedValue([{ id: "d1" }]);
    const response = await GET({ userId: "user-1" } as any);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([{ id: "d1" }]);
  });
});
