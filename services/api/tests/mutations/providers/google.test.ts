import { describe, it, expect, vi, beforeEach } from "vitest";
import { createGoogleEvent, updateGoogleEvent, deleteGoogleEvent, rsvpGoogleEvent, getPendingGoogleInvites } from "../../../src/mutations/providers/google";

describe("google provider mutations", () => {
  const mockAccessToken = "at";
  const mockExternalCalendarId = "cal-1";

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  describe("createGoogleEvent", () => {
    it("calls google API and returns UID", async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ iCalUID: "google-uid" }),
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await createGoogleEvent(mockAccessToken, mockExternalCalendarId, {
        title: "Test",
        startTime: "2026-01-01T10:00:00Z",
        endTime: "2026-01-01T11:00:00Z",
        calendarId: "cal-1",
      });

      expect(result.success).toBe(true);
      expect(result.sourceEventUid).toBe("google-uid");
      expect(global.fetch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ method: "POST" })
      );
    });

    it("handles error response", async () => {
      const mockResponse = {
        ok: false,
        statusText: "Forbidden",
        json: async () => ({ error: { message: "Auth error" } }),
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await createGoogleEvent(mockAccessToken, mockExternalCalendarId, {
        title: "Test",
        startTime: "2026-01-01T10:00:00Z",
        endTime: "2026-01-01T11:00:00Z",
        calendarId: "cal-1",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Auth error");
    });
  });

  describe("updateGoogleEvent", () => {
    it("returns error if event not found", async () => {
      const mockFindResponse = {
        ok: true,
        json: async () => ({ items: [] }),
      };
      (global.fetch as any).mockResolvedValue(mockFindResponse);

      const result = await updateGoogleEvent(mockAccessToken, mockExternalCalendarId, "g-uid", { title: "New" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Event not found on Google Calendar.");
    });

    it("finds event and patches it", async () => {
      const mockFindResponse = {
        ok: true,
        json: async () => ({ items: [{ id: "g-id" }] }),
      };
      const mockPatchResponse = {
        ok: true,
        json: async () => ({}),
      };
      (global.fetch as any).mockResolvedValueOnce(mockFindResponse).mockResolvedValueOnce(mockPatchResponse);

      const result = await updateGoogleEvent(mockAccessToken, mockExternalCalendarId, "g-uid", { title: "New" });

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("deleteGoogleEvent", () => {
    it("finds event and deletes it", async () => {
      const mockFindResponse = {
        ok: true,
        json: async () => ({ items: [{ id: "g-id" }] }),
      };
      const mockDeleteResponse = {
        ok: true,
        body: { cancel: vi.fn() },
      };
      (global.fetch as any).mockResolvedValueOnce(mockFindResponse).mockResolvedValueOnce(mockDeleteResponse);

      const result = await deleteGoogleEvent(mockAccessToken, mockExternalCalendarId, "g-uid");

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("rsvpGoogleEvent", () => {
    it("finds event and patches attendees", async () => {
      const mockFindResponse = {
        ok: true,
        json: async () => ({ items: [{ id: "g-id", attendees: [{ email: "test@example.com" }] }] }),
      };
      const mockPatchResponse = {
        ok: true,
        json: async () => ({}),
      };
      (global.fetch as any).mockResolvedValueOnce(mockFindResponse).mockResolvedValueOnce(mockPatchResponse);

      const result = await rsvpGoogleEvent(mockAccessToken, mockExternalCalendarId, "g-uid", "accepted", "test@example.com");

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("getPendingGoogleInvites", () => {
    it("returns pending invites", async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          items: [
            {
              iCalUID: "pending-1",
              summary: "Pending",
              attendees: [{ self: true, responseStatus: "needsAction" }],
              start: { dateTime: "2026-01-01T10:00:00Z" },
              end: { dateTime: "2026-01-01T11:00:00Z" },
            },
          ],
        }),
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      const invites = await getPendingGoogleInvites(mockAccessToken, mockExternalCalendarId, "2026-01-01", "2026-01-02");

      expect(invites).toHaveLength(1);
      expect(invites[0].sourceEventUid).toBe("pending-1");
    });
  });
});
