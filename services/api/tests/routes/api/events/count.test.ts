import { describe, it, expect, vi } from "vitest";

const { mockKeeperApi } = vi.hoisted(() => ({
  mockKeeperApi: {
    getEventCount: vi.fn(),
  },
}));

vi.mock("@/read-models", () => ({
  createKeeperApi: vi.fn(() => mockKeeperApi),
}));

import { GET } from "@/routes/api/events/count";

describe("events count route", () => {
  it("returns event count", async () => {
    mockKeeperApi.getEventCount.mockResolvedValue(42);
    const response = await GET({ userId: "u1" } as any);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ count: 42 });
  });
});
