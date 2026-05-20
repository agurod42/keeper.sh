import { describe, it, expect, vi } from "vitest";
import { handlePatchSourceRoute } from "@/routes/api/sources/[id]/source-item-routes";

describe("handlePatchSourceRoute", () => {
  const mockDeps = {
    updateSource: vi.fn(),
    canUseEventFilters: vi.fn(),
  };

  it("updates source successfully", async () => {
    mockDeps.updateSource.mockResolvedValue({ id: "s1", name: "New Name" });
    const response = await handlePatchSourceRoute(
      { params: { id: "s1" }, userId: "u1", body: { name: "New Name" } },
      mockDeps
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: "s1", name: "New Name" });
  });

  it("returns 403 when free users use event filters", async () => {
    mockDeps.canUseEventFilters.mockResolvedValue(false);
    const response = await handlePatchSourceRoute(
      { params: { id: "s1" }, userId: "u1", body: { excludeAllDayEvents: true } },
      mockDeps
    );

    expect(response.status).toBe(403);
  });
});
