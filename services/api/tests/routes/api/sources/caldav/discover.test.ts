import { describe, it, expect, vi } from "vitest";
import { POST } from "@/routes/api/sources/caldav/discover";

vi.mock("@keeper.sh/calendar/caldav", () => ({
  createCalDAVClient: vi.fn(() => ({
    discoverCalendars: vi.fn().mockResolvedValue([{ url: "cal-url", name: "My Cal" }]),
    getResolvedAuthMethod: vi.fn().mockReturnValue("basic"),
  })),
}));

describe("caldav sources discover route", () => {
  it("discovers calendars successfully", async () => {
    const body = {
      serverUrl: "https://dav.com",
      username: "user",
      password: "pass",
    };
    const request = new Request("http://localhost:3000/api/sources/caldav/discover", {
      method: "POST",
      body: JSON.stringify(body),
    });

    const response = await POST({ request } as any);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      calendars: [{ url: "cal-url", name: "My Cal" }],
      authMethod: "basic",
    });
  });
});
