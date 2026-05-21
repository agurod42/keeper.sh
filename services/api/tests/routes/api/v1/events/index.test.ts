import { describe, it, expect, vi } from "vitest";

const { mockKeeperApi } = vi.hoisted(() => ({
  mockKeeperApi: {
    getEventsInRange: vi.fn(),
    createEvent: vi.fn(),
  },
}));

vi.mock("@/read-models", () => ({
  createKeeperApi: vi.fn(() => mockKeeperApi),
}));

import { GET, POST } from "@/routes/api/v1/events/index";

describe("v1 events index route", () => {
  it("returns events in range", async () => {
    mockKeeperApi.getEventsInRange.mockResolvedValue([{ id: "e1" }]);
    const request = new Request("http://localhost:3000/api/v1/events?from=2026-01-01&to=2026-01-02");
    const response = await GET({ request, userId: "u1" } as any);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([{ id: "e1" }]);
  });

  it("creates event successfully", async () => {
    const body = {
      calendarId: "c1",
      title: "Test",
      startTime: "2026-01-01T10:00:00Z",
      endTime: "2026-01-01T11:00:00Z",
    };
    const request = new Request("http://localhost:3000/api/v1/events", {
      method: "POST",
      body: JSON.stringify(body),
    });

    mockKeeperApi.createEvent.mockResolvedValue({ success: true, event: { id: "e1" } });

    const response = await POST({ request, userId: "u1" } as any);

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ id: "e1" });
  });
});
