import { describe, it, expect, vi } from "vitest";

const { mockKeeperApi } = vi.hoisted(() => ({
  mockKeeperApi: {
    listSources: vi.fn(),
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

import { GET } from "@/routes/api/sources/index";

describe("sources list route", () => {
  it("returns list of sources", async () => {
    mockKeeperApi.listSources.mockResolvedValue([{ id: "s1" }]);
    const response = await GET({ userId: "user-1" } as any);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([{ id: "s1" }]);
  });
});
