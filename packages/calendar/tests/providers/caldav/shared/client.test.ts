import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCalDAVClient } from "../../../../src/providers/caldav/shared/client";

vi.mock("tsdav", () => ({
  createDAVClient: vi.fn().mockResolvedValue({
    fetchCalendars: vi.fn().mockResolvedValue([
      { url: "https://dav.com/cal", displayName: "My Cal", components: ["VEVENT"] }
    ]),
  }),
}));

describe("CalDAVClient", () => {
  const mockConfig = {
    credentials: { username: "u", password: "p" },
    serverUrl: "https://dav.com",
  };

  it("discovers calendars correctly", async () => {
    const client = createCalDAVClient(mockConfig);
    const calendars = await client.discoverCalendars();
    
    expect(calendars).toHaveLength(1);
    expect(calendars[0].displayName).toBe("My Cal");
  });

  it("resolves calendar display name", async () => {
    const client = createCalDAVClient(mockConfig);
    const name = await client.fetchCalendarDisplayName("https://other.com/cal");
    expect(name).toBe("My Cal"); // path matches /cal
  });
});
