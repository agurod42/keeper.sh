import { describe, it, expect, vi } from "vitest";

vi.mock("../../src/context", () => ({
  withWideEvent: (handler: any) => handler,
}));

import { GET } from "../../src/routes/health";

describe("mcp health route", () => {
  it("returns ok", async () => {
    const response = await GET(new Request("http://localhost/health"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ service: "keeper-mcp", status: "ok" });
  });
});
