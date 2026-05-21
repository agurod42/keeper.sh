import { describe, it, expect, vi } from "vitest";
import { GET } from "@/routes/api/sources/outlook/calendars";

vi.mock("@/utils/oauth-calendar-listing", () => ({
  listOAuthCalendars: vi.fn(() => Promise.resolve(Response.json([{ id: "c1" }]))),
}));

describe("outlook sources calendars route", () => {
  it("calls listOAuthCalendars", async () => {
    const request = new Request("http://localhost:3000/api/sources/outlook/calendars");
    const response = await GET({ request, userId: "u1" } as any);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([{ id: "c1" }]);
  });
});
