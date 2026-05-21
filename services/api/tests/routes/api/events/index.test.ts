import { describe, it, expect, vi } from "vitest";

const { mockKeeperApi } = vi.hoisted(() => ({
  mockKeeperApi: {
    getEventsInRange: vi.fn(),
  },
}));

vi.mock("@/read-models", () => ({
  createKeeperApi: vi.fn(() => mockKeeperApi),
}));

import { GET } from "@/routes/api/events/index";

describe("events index route", () => {
  it("returns events in range", async () => {
    mockKeeperApi.getEventsInRange.mockResolvedValue([{ id: "e1" }]);
    const request = new Request("http://localhost:3000/api/events?from=2026-01-01&to=2026-01-02");
    const response = await GET({ request, userId: "u1" } as any);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([{ id: "e1" }]);
  });
});
