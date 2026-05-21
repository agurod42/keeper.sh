import { describe, it, expect, vi } from "vitest";
import { DELETE } from "@/routes/api/tokens/[id]";
import { database } from "@/context";

describe("token item route", () => {
  it("deletes token successfully", async () => {
    (database.delete as any).mockReturnValue({
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ id: "t1" }]),
    });

    const response = await DELETE({ params: { id: "t1" }, userId: "u1" } as any);
    expect(response.status).toBe(204);
  });

  it("returns 404 if token not found", async () => {
    (database.delete as any).mockReturnValue({
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([]),
    });

    const response = await DELETE({ params: { id: "t1" }, userId: "u1" } as any);
    expect(response.status).toBe(404);
  });
});
