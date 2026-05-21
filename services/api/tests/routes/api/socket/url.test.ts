import { describe, it, expect, vi } from "vitest";
import { GET } from "@/routes/api/socket/url";
import * as state from "@/utils/state";

vi.mock("@/utils/state", () => ({
  generateSocketToken: vi.fn(),
}));

vi.mock("@/env", () => ({
  default: {
    WEBSOCKET_URL: "ws://localhost:3001",
  },
}));

describe("socket url route", () => {
  it("returns socket URL with token", async () => {
    (state.generateSocketToken as any).mockResolvedValue("socket-token");
    const response = await GET({ userId: "u1" } as any);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ socketUrl: "ws://localhost:3001/?token=socket-token" });
  });
});
