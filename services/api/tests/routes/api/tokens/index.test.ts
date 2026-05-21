import { describe, it, expect, vi } from "vitest";
import { GET, POST } from "@/routes/api/tokens/index";
import { database } from "@/context";

vi.mock("@/utils/api-tokens", () => ({
  generateApiToken: vi.fn(() => "kp_test_token"),
  hashApiToken: vi.fn(() => "hashed"),
  extractTokenPrefix: vi.fn(() => "kp_test"),
}));

describe("tokens index route", () => {
  it("returns list of tokens", async () => {
    (database.select as any).mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([{ id: "t1" }]),
    });

    const response = await GET({ userId: "u1" } as any);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([{ id: "t1" }]);
  });

  it("creates token successfully", async () => {
    const body = { name: "New Token" };
    const request = new Request("http://localhost:3000/api/tokens", {
      method: "POST",
      body: JSON.stringify(body),
    });

    (database.insert as any).mockReturnValue({
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ id: "t1", name: "New Token" }]),
    });

    const response = await POST({ request, userId: "u1" } as any);

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.token).toBe("kp_test_token");
  });
});
