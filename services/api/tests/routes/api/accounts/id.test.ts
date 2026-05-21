import { describe, it, expect, vi } from "vitest";
import { GET, DELETE } from "@/routes/api/accounts/[id]";
import { database } from "@/context";

vi.mock("@/utils/invalidate-calendars", () => ({
  invalidateCalendarsForAccount: vi.fn(),
}));

describe("account item route", () => {
  it("returns account details", async () => {
    const mockAccount = { id: "a1", provider: "google" };
    (database.select as any).mockReturnValue({
      from: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([mockAccount]),
    });

    const response = await GET({ params: { id: "a1" }, userId: "u1" } as any);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ id: "a1" });
  });

  it("deletes account successfully", async () => {
    (database.delete as any).mockReturnValue({
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ id: "a1" }]),
    });

    const response = await DELETE({ params: { id: "a1" }, userId: "u1" } as any);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
  });
});
