import { describe, it, expect, vi } from "vitest";
import { POST } from "@/routes/api/destinations/caldav/index";
import * as caldav from "@/utils/caldav";

vi.mock("@/utils/caldav", () => ({
  createCalDAVDestination: vi.fn(),
  isValidProvider: vi.fn(() => true),
  DestinationLimitError: class extends Error {},
  CalDAVConnectionError: class extends Error {},
}));

describe("caldav destination route", () => {
  it("creates caldav destination successfully", async () => {
    const body = {
      serverUrl: "https://dav.com",
      username: "user",
      password: "pass",
      calendarUrl: "https://dav.com/cal",
    };
    const request = new Request("http://localhost:3000/api/destinations/caldav", {
      method: "POST",
      body: JSON.stringify(body),
    });

    const response = await POST({ request, userId: "u1" } as any);

    expect(response.status).toBe(201);
    expect(caldav.createCalDAVDestination).toHaveBeenCalled();
  });
});
