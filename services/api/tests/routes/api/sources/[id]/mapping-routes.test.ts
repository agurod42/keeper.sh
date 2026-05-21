import { describe, it, expect, vi } from "vitest";
import { handleGetSourceDestinationsRoute, handlePutSourceDestinationsRoute } from "@/routes/api/sources/[id]/mapping-routes";

describe("mapping routes", () => {
  const mockDeps = {
    sourceExists: vi.fn(),
    getDestinationsForSource: vi.fn(),
    setDestinationsForSource: vi.fn(),
    setSourcesForDestination: vi.fn(),
  };

  describe("handleGetSourceDestinationsRoute", () => {
    it("returns destination IDs if source exists", async () => {
      mockDeps.sourceExists.mockResolvedValue(true);
      mockDeps.getDestinationsForSource.mockResolvedValue(["d1", "d2"]);

      const response = await handleGetSourceDestinationsRoute(
        { params: { id: "s1" }, userId: "u1" },
        mockDeps as any
      );

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ destinationIds: ["d1", "d2"] });
    });

    it("returns 404 if source not found", async () => {
      mockDeps.sourceExists.mockResolvedValue(false);

      const response = await handleGetSourceDestinationsRoute(
        { params: { id: "s1" }, userId: "u1" },
        mockDeps as any
      );

      expect(response.status).toBe(404);
    });
  });

  describe("handlePutSourceDestinationsRoute", () => {
    it("updates mappings successfully", async () => {
      const response = await handlePutSourceDestinationsRoute(
        { params: { id: "s1" }, userId: "u1", body: { calendarIds: ["d1"] } },
        mockDeps as any
      );

      expect(response.status).toBe(200);
      expect(mockDeps.setDestinationsForSource).toHaveBeenCalledWith("u1", "s1", ["d1"]);
    });

    it("returns 402 on payment required (mapping limit reached)", async () => {
      mockDeps.setDestinationsForSource.mockRejectedValue(new Error("Mapping limit reached. Upgrade to Pro for unlimited sync mappings."));
      
      const response = await handlePutSourceDestinationsRoute(
        { params: { id: "s1" }, userId: "u1", body: { calendarIds: ["d1"] } },
        mockDeps as any
      );

      expect(response.status).toBe(402);
    });
  });

  describe("handleGetSourcesForDestinationRoute", () => {
    it("returns source IDs if destination exists", async () => {
      const mockDepsLocal = {
        ...mockDeps,
        destinationExists: vi.fn().mockResolvedValue(true),
        getSourcesForDestination: vi.fn().mockResolvedValue(["s1", "s2"]),
      };

      const { handleGetSourcesForDestinationRoute } = await import("@/routes/api/sources/[id]/mapping-routes");
      const response = await handleGetSourcesForDestinationRoute(
        { params: { id: "d1" }, userId: "u1" },
        mockDepsLocal as any
      );

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ sourceIds: ["s1", "s2"] });
    });
  });

  describe("handlePutSourcesForDestinationRoute", () => {
    it("updates sources for destination successfully", async () => {
      mockDeps.setSourcesForDestination.mockResolvedValue(undefined);

      const { handlePutSourcesForDestinationRoute } = await import("@/routes/api/sources/[id]/mapping-routes");
      const response = await handlePutSourcesForDestinationRoute(
        { params: { id: "d1" }, userId: "u1", body: { calendarIds: ["s1"] } },
        mockDeps as any
      );

      expect(response.status).toBe(200);
      expect(mockDeps.setSourcesForDestination).toHaveBeenCalledWith("u1", "d1", ["s1"]);
    });
  });
});
