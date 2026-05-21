import { describe, it, expect, vi } from "vitest";
import { GET } from "@/routes/api/accounts/index";
import { database } from "@/context";

describe("accounts index route", () => {
  it("returns list of accounts", async () => {
    const mockAccounts = [
      { id: "a1", provider: "google", email: "test@gmail.com", createdAt: new Date() },
    ];
    (database.select as any).mockReturnValue({
      from: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue(mockAccounts),
    });

    const response = await GET({ userId: "u1" } as any);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data[0].id).toBe("a1");
  });
});
