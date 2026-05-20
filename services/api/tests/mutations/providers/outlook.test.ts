import { describe, it, expect, vi, beforeEach } from "vitest";
import { createOutlookEvent, updateOutlookEvent, deleteOutlookEvent, rsvpOutlookEvent, getPendingOutlookInvites } from "../../../src/mutations/providers/outlook";

describe("outlook provider mutations", () => {
  const mockAccessToken = "at";

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  describe("createOutlookEvent", () => {
    it("calls outlook API and returns UID", async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ iCalUId: "outlook-uid" }),
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await createOutlookEvent(mockAccessToken, {
        title: "Test",
        startTime: "2026-01-01T10:00:00Z",
        endTime: "2026-01-01T11:00:00Z",
        calendarId: "cal-1",
      });

      expect(result.success).toBe(true);
      expect(result.sourceEventUid).toBe("outlook-uid");
    });
  });

  describe("updateOutlookEvent", () => {
    it("finds event and patches it", async () => {
      const mockFindResponse = {
        ok: true,
        json: async () => ({ value: [{ id: "o-id" }] }),
      };
      const mockPatchResponse = {
        ok: true,
        json: async () => ({}),
      };
      (global.fetch as any).mockResolvedValueOnce(mockFindResponse).mockResolvedValueOnce(mockPatchResponse);

      const result = await updateOutlookEvent(mockAccessToken, "o-uid", { title: "New" });

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("deleteOutlookEvent", () => {
    it("finds event and deletes it", async () => {
      const mockFindResponse = {
        ok: true,
        json: async () => ({ value: [{ id: "o-id" }] }),
      };
      const mockDeleteResponse = {
        ok: true,
        body: { cancel: vi.fn() },
      };
      (global.fetch as any).mockResolvedValueOnce(mockFindResponse).mockResolvedValueOnce(mockDeleteResponse);

      const result = await deleteOutlookEvent(mockAccessToken, "o-uid");

      expect(result.success).toBe(true);
    });
  });

  describe("rsvpOutlookEvent", () => {
    it("finds event and posts rsvp", async () => {
      const mockFindResponse = {
        ok: true,
        json: async () => ({ value: [{ id: "o-id" }] }),
      };
      const mockPostResponse = {
        ok: true,
        body: { cancel: vi.fn() },
      };
      (global.fetch as any).mockResolvedValueOnce(mockFindResponse).mockResolvedValueOnce(mockPostResponse);

      const result = await rsvpOutlookEvent(mockAccessToken, "o-uid", "accepted");

      expect(result.success).toBe(true);
    });
  });

  describe("getPendingOutlookInvites", () => {
    it("returns pending invites", async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          value: [
            {
              iCalUId: "pending-1",
              subject: "Pending",
              start: { dateTime: "2026-01-01T10:00:00Z" },
              end: { dateTime: "2026-01-01T11:00:00Z" },
              responseStatus: { response: "notResponded" },
            },
          ],
        }),
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      const invites = await getPendingOutlookInvites(mockAccessToken, "2026-01-01", "2026-01-02");

      expect(invites).toHaveLength(1);
      expect(invites[0].sourceEventUid).toBe("pending-1");
    });
  });
});
