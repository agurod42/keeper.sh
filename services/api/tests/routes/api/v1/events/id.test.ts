import { describe, it, expect, vi } from "vitest";

const { mockKeeperApi } = vi.hoisted(() => ({
  mockKeeperApi: {
    getEvent: vi.fn(),
    updateEvent: vi.fn(),
    deleteEvent: vi.fn(),
    rsvpEvent: vi.fn(),
  },
}));

vi.mock("@/read-models", () => ({
  createKeeperApi: vi.fn(() => mockKeeperApi),
}));

import { GET, PATCH, DELETE } from "@/routes/api/v1/events/[id]";

describe("v1 event item route", () => {
  it("GET returns event", async () => {
    mockKeeperApi.getEvent.mockResolvedValue({ id: "e1" });
    const response = await GET({ params: { id: "e1" }, userId: "u1" } as any);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: "e1" });
  });

  it("PATCH updates event", async () => {
    mockKeeperApi.updateEvent.mockResolvedValue({ success: true });
    mockKeeperApi.getEvent.mockResolvedValue({ id: "e1", title: "New" });
    
    const request = new Request("http://localhost:3000", { method: "PATCH", body: JSON.stringify({ title: "New" }) });
    const response = await PATCH({ request, params: { id: "e1" }, userId: "u1" } as any);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: "e1", title: "New" });
  });

  it("DELETE removes event", async () => {
    mockKeeperApi.deleteEvent.mockResolvedValue({ success: true });
    const response = await DELETE({ params: { id: "e1" }, userId: "u1" } as any);
    expect(response.status).toBe(204);
  });
});
