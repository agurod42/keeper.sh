import { describe, it, expect, vi } from "vitest";

vi.mock("@/utils/middleware", () => ({
  withWideEvent: (handler: any) => handler,
}));

import { GET } from "@/routes/api/health";

describe("health route", () => {
  it("returns ok status", async () => {
    const response = await GET({} as any);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: "ok" });
  });
});
