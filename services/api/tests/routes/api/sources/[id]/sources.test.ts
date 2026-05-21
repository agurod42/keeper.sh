import { describe, it, expect, vi } from "vitest";
import { GET, PUT } from "@/routes/api/sources/[id]/sources";
import * as mappingRoutes from "@/routes/api/sources/[id]/mapping-routes";

vi.mock("@/routes/api/sources/[id]/mapping-routes", () => ({
  handleGetSourcesForDestinationRoute: vi.fn(() => Response.json({ sourceIds: [] })),
  handlePutSourcesForDestinationRoute: vi.fn(() => Response.json({ success: true })),
}));

describe("destination sources route", () => {
  it("GET calls handleGetSourcesForDestinationRoute", async () => {
    const response = await GET({ params: { id: "d1" }, userId: "u1" } as any);
    expect(response.status).toBe(200);
    expect(mappingRoutes.handleGetSourcesForDestinationRoute).toHaveBeenCalled();
  });

  it("PUT calls handlePutSourcesForDestinationRoute", async () => {
    const request = new Request("http://localhost:3000", { method: "PUT", body: JSON.stringify({ calendarIds: [] }) });
    const response = await PUT({ request, params: { id: "d1" }, userId: "u1" } as any);
    expect(response.status).toBe(200);
    expect(mappingRoutes.handlePutSourcesForDestinationRoute).toHaveBeenCalled();
  });
});
