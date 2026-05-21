import { describe, it, expect, vi } from "vitest";
import { handleGetIcsSourcesRoute, handlePostIcsSourceRoute } from "@/routes/api/ics/source-routes";

describe("ics source routes", () => {
  const mockDeps = {
    getUserSources: vi.fn(),
    createSource: vi.fn(),
    isInvalidSourceUrlError: vi.fn(() => false),
    isSourceLimitError: vi.fn(() => false),
    parseCreateSourceBody: vi.fn((b) => b),
  };

  describe("handleGetIcsSourcesRoute", () => {
    it("returns user ics sources", async () => {
      mockDeps.getUserSources.mockResolvedValue([{ id: "s1" }]);
      const response = await handleGetIcsSourcesRoute({ userId: "u1" }, mockDeps as any);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual([{ id: "s1" }]);
    });
  });

  describe("handlePostIcsSourceRoute", () => {
    it("creates ics source successfully", async () => {
      mockDeps.createSource.mockResolvedValue({ id: "s1" });
      const response = await handlePostIcsSourceRoute(
        { userId: "u1", body: { url: "http://test.com/cal.ics", name: "Test" } },
        mockDeps as any
      );
      expect(response.status).toBe(201);
      expect(await response.json()).toEqual({ id: "s1" });
    });
  });
});
