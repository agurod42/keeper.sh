import { describe, it, expect, vi } from "vitest";
import { GET, PUT } from "@/routes/api/sources/[id]/destinations";
import * as mappingRoutes from "@/routes/api/sources/[id]/mapping-routes";

vi.mock("@/routes/api/sources/[id]/mapping-routes", () => ({
  handleGetSourceDestinationsRoute: vi.fn(() => Response.json({ destinationIds: [] })),
  handlePutSourceDestinationsRoute: vi.fn(() => Response.json({ success: true })),
}));

describe("source destinations route", () => {
  it("GET calls handleGetSourceDestinationsRoute", async () => {
    const response = await GET({ params: { id: "s1" }, userId: "u1" } as any);
    expect(response.status).toBe(200);
    expect(mappingRoutes.handleGetSourceDestinationsRoute).toHaveBeenCalled();
  });

  it("PUT calls handlePutSourceDestinationsRoute", async () => {
    const request = new Request("http://localhost:3000", { method: "PUT", body: JSON.stringify({ calendarIds: [] }) });
    const response = await PUT({ request, params: { id: "s1" }, userId: "u1" } as any);
    expect(response.status).toBe(200);
    expect(mappingRoutes.handlePutSourceDestinationsRoute).toHaveBeenCalled();
  });
});
