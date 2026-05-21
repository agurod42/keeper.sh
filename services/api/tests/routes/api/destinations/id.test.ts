import { describe, it, expect, vi } from "vitest";
import { DELETE } from "@/routes/api/destinations/[id]";
import * as destinations from "@/utils/destinations";

vi.mock("@/utils/destinations", () => ({
  deleteCalendarDestination: vi.fn(),
}));

describe("destination item route", () => {
  it("deletes destination successfully", async () => {
    (destinations.deleteCalendarDestination as any).mockResolvedValue(true);
    const response = await DELETE({ params: { id: "d1" }, userId: "u1" } as any);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
  });

  it("returns 404 if destination not found", async () => {
    (destinations.deleteCalendarDestination as any).mockResolvedValue(false);
    const response = await DELETE({ params: { id: "d1" }, userId: "u1" } as any);
    expect(response.status).toBe(404);
  });
});
