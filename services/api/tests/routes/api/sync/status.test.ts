import { describe, it, expect, vi } from "vitest";

const { mockKeeperApi } = vi.hoisted(() => ({
  mockKeeperApi: {
    getSyncStatuses: vi.fn(),
  },
}));

vi.mock("@/read-models", () => ({
  createKeeperApi: vi.fn(() => mockKeeperApi),
}));

import { GET } from "@/routes/api/sync/status";

describe("sync status route", () => {
  it("returns sync statuses", async () => {
    mockKeeperApi.getSyncStatuses.mockResolvedValue([{ id: "d1", status: "success" }]);
    const response = await GET({ userId: "u1" } as any);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ destinations: [{ id: "d1", status: "success" }] });
  });
});
