import { describe, it, expect, vi } from "vitest";
import { GET } from "@/routes/api/v1/accounts/index";
import { database } from "@/context";

describe("v1 accounts index route", () => {
  it("returns user accounts", async () => {
    const mockAccounts = [{ id: "a1", provider: "google" }];
    (database.select as any).mockReturnValue({
      from: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue(mockAccounts),
    });

    const request = new Request("http://localhost:3000/api/v1/accounts");
    const response = await GET({ request, userId: "u1" } as any);

    expect(response.status).toBe(200);
    expect(await response.json()).toHaveLength(1);
  });
});
