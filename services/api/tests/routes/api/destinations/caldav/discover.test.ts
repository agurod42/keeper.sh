import { describe, it, expect, vi } from "vitest";
import { POST } from "@/routes/api/destinations/caldav/discover";
import * as caldav from "@/utils/caldav";

vi.mock("@/utils/caldav", () => ({
  discoverCalendars: vi.fn(),
  CalDAVConnectionError: class extends Error {},
}));

describe("caldav destinations discover route", () => {
  it("discovers calendars successfully", async () => {
    const body = {
      serverUrl: "https://dav.com",
      username: "user",
      password: "pass",
    };
    const request = new Request("http://localhost:3000/api/destinations/caldav/discover", {
      method: "POST",
      body: JSON.stringify(body),
    });

    (caldav.discoverCalendars as any).mockResolvedValue({
      calendars: [{ url: "cal-url", name: "My Cal" }],
      authMethod: "basic",
    });

    const response = await POST({ request } as any);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      calendars: [{ url: "cal-url", name: "My Cal" }],
      authMethod: "basic",
    });
  });
});
