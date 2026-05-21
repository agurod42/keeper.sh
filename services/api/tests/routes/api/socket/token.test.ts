import { describe, it, expect, vi } from "vitest";
import { GET } from "@/routes/api/socket/token";
import * as state from "@/utils/state";

vi.mock("@/utils/state", () => ({
  generateSocketToken: vi.fn(),
}));

describe("socket token route", () => {
  it("returns socket token", async () => {
    (state.generateSocketToken as any).mockResolvedValue("socket-token");
    const response = await GET({ userId: "u1" } as any);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ token: "socket-token" });
  });
});
