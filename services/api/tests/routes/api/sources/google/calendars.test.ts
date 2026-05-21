import { describe, it, expect, vi } from "vitest";
import { GET } from "@/routes/api/sources/google/calendars";

vi.mock("@/utils/oauth-calendar-listing", () => ({
  listOAuthCalendars: vi.fn(() => Promise.resolve(Response.json([{ id: "c1" }]))),
}));

describe("google sources calendars route", () => {
  it("calls listOAuthCalendars", async () => {
    const request = new Request("http://localhost:3000/api/sources/google/calendars");
    const response = await GET({ request, userId: "u1" } as any);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([{ id: "c1" }]);
  });
});
