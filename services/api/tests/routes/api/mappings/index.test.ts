import { describe, it, expect, vi } from "vitest";

const { mockKeeperApi } = vi.hoisted(() => ({
  mockKeeperApi: {
    listMappings: vi.fn(),
  },
}));

vi.mock("@/read-models", () => ({
  createKeeperApi: vi.fn(() => mockKeeperApi),
}));

import { GET } from "@/routes/api/mappings/index";

describe("mappings list route", () => {
  it("returns list of mappings", async () => {
    mockKeeperApi.listMappings.mockResolvedValue([{ id: "m1" }]);
    const response = await GET({ userId: "u1" } as any);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([{ id: "m1" }]);
  });
});
