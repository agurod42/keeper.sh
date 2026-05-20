import { describe, it, expect, vi } from "vitest";

vi.mock("@/utils/middleware", () => ({
  withV1Auth: (handler: any) => handler,
  withWideEvent: (handler: any) => handler,
}));

vi.mock("@/context", () => ({
  baseUrl: "http://localhost:3000",
}));

vi.mock("@/utils/user", () => ({
  getUserIdentifierToken: vi.fn(),
}));

import { GET } from "@/routes/api/v1/ical/index";
import * as userUtils from "@/utils/user";

describe("v1 ical route", () => {
  it("returns ical URL", async () => {
    (userUtils.getUserIdentifierToken as any).mockResolvedValue("user-token");
    const response = await GET({ userId: "user-1" } as any);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ url: "http://localhost:3000/api/cal/user-token.ics" });
  });
});
