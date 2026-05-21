import { describe, it, expect, vi, beforeEach } from "vitest";
import { createKeeperMcpToolset } from "../src/toolset";

describe("MCP toolset execution", () => {
  const toolset = createKeeperMcpToolset();
  const mockContext = {
    bearerToken: "test-token",
    apiBaseUrl: "http://api",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  describe("list_calendars", () => {
    it("calls API and returns calendars", async () => {
      const mockCalendars = [{ id: "c1", name: "Cal", provider: "google", account: "test" }];
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockCalendars,
      });

      const result = await toolset.list_calendars.execute(mockContext);

      expect(result).toEqual(mockCalendars);
      expect(global.fetch).toHaveBeenCalledWith(
        "http://api/api/v1/calendars",
        expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer test-token" }) })
      );
    });
  });

  describe("get_events", () => {
    it("calls API with filters", async () => {
      const mockEvents = [{ 
        id: "e1", 
        startTime: "2026-01-01T10:00:00Z", 
        endTime: "2026-01-01T11:00:00Z", 
        title: "Test", 
        description: null,
        location: null,
        calendarId: "c1", 
        calendarName: "Cal", 
        calendarProvider: "google",
        calendarUrl: null
      }];
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockEvents,
      });

      const input = { from: "2026-01-01T00:00:00Z", to: "2026-01-02T00:00:00Z", timezone: "UTC" };
      const result = await toolset.get_events.execute(mockContext, input);

      expect(result).toEqual([{
        ...mockEvents[0],
        startTime: "2026-01-01T10:00:00+00:00",
        endTime: "2026-01-01T11:00:00+00:00",
      }]);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/events?from=2026-01-01T00%3A00%3A00Z"),
        expect.anything()
      );
    });
  });

  describe("create_event", () => {
    it("calls API POST and returns event", async () => {
      const mockEvent = { 
        id: "e1", 
        startTime: "2026-01-01T10:00:00Z", 
        endTime: "2026-01-01T11:00:00Z", 
        title: "Test",
        description: null,
        location: null,
        calendarId: "c1",
        calendarName: "Cal",
        calendarProvider: "google",
        calendarUrl: null
      };
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockEvent,
      });

      const input = {
        calendarId: "c1",
        title: "Test",
        startTime: "2026-01-01T10:00:00Z",
        endTime: "2026-01-01T11:00:00Z",
      };
      const result = await toolset.create_event.execute(mockContext, input);

      expect(result).toMatchObject({ id: "e1" });
      expect(global.fetch).toHaveBeenCalledWith(
        "http://api/api/v1/events",
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  describe("delete_event", () => {
    it("calls API DELETE", async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 204,
        json: async () => ({}),
      });

      const result = await toolset.delete_event.execute(mockContext, { eventId: "e1" });

      expect(result).toEqual({ deleted: true });
      expect(global.fetch).toHaveBeenCalledWith(
        "http://api/api/v1/events/e1",
        expect.objectContaining({ method: "DELETE" })
      );
    });
  });

  describe("get_event_count", () => {
    it("calls API count and returns count", async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ count: 42 }),
      });

      const result = await toolset.get_event_count.execute(mockContext);

      expect(result).toEqual({ count: 42 });
    });
  });

  describe("update_event", () => {
    it("calls API PATCH and returns event", async () => {
      const mockEvent = { 
        id: "e1", 
        startTime: "2026-01-01T10:00:00Z", 
        endTime: "2026-01-01T11:00:00Z", 
        title: "Updated",
        description: null,
        location: null,
        calendarId: "c1",
        calendarName: "Cal",
        calendarProvider: "google",
        calendarUrl: null
      };
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockEvent,
      });

      const input = {
        eventId: "e1",
        title: "Updated",
      };
      const result = await toolset.update_event.execute(mockContext, input);

      expect(result).toMatchObject({ id: "e1", title: "Updated" });
      expect(global.fetch).toHaveBeenCalledWith(
        "http://api/api/v1/events/e1",
        expect.objectContaining({ method: "PATCH" })
      );
    });
  });

  describe("get_event", () => {
    it("calls API GET and returns event", async () => {
      const mockEvent = { 
        id: "e1", 
        startTime: "2026-01-01T10:00:00Z", 
        endTime: "2026-01-01T11:00:00Z", 
        title: "Test",
        description: null,
        location: null,
        calendarId: "c1",
        calendarName: "Cal",
        calendarProvider: "google",
        calendarUrl: null
      };
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockEvent,
      });

      const result = await toolset.get_event.execute(mockContext, { eventId: "e1" });

      expect(result).toMatchObject({ id: "e1" });
    });
  });

  describe("rsvp_event", () => {
    it("calls API PATCH and returns status", async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ rsvpStatus: "accepted" }),
      });

      const result = await toolset.rsvp_event.execute(mockContext, { eventId: "e1", rsvpStatus: "accepted" });

      expect(result).toEqual({ rsvpStatus: "accepted" });
      expect(global.fetch).toHaveBeenCalledWith(
        "http://api/api/v1/events/e1",
        expect.objectContaining({ method: "PATCH", body: expect.stringContaining("accepted") })
      );
    });
  });

  describe("get_pending_invites", () => {
    it("calls API GET and returns invites", async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => [{ title: "Invite" }],
      });

      const input = {
        calendarId: "c1",
        from: "2026-01-01T00:00:00Z",
        to: "2026-01-02T00:00:00Z",
        timezone: "UTC",
      };
      const result = await toolset.get_pending_invites.execute(mockContext, input);

      expect(result).toHaveLength(1);
    });
  });

  describe("list_accounts", () => {
    it("calls API GET and returns accounts", async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => [{ id: "a1" }],
      });

      const result = await toolset.list_accounts.execute(mockContext);

      expect(result).toHaveLength(1);
    });
  });

  describe("get_ical_feed", () => {
    it("calls API GET and returns url", async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ url: "http://feed" }),
      });

      const result = await toolset.get_ical_feed.execute(mockContext);

      expect(result).toEqual({ url: "http://feed" });
    });
  });

  describe("apiFetch error handling", () => {
    it("throws error with message from body", async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Custom Error" }),
      });

      await expect(toolset.list_calendars.execute(mockContext)).rejects.toThrow("Custom Error");
    });

    it("throws error with statusText if body has no error", async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        statusText: "Bad Request",
        json: async () => ({}),
      });

      await expect(toolset.list_calendars.execute(mockContext)).rejects.toThrow("Bad Request");
    });
  });
});
