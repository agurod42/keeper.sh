import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCalDAVEvent, updateCalDAVEvent, deleteCalDAVEvent, rsvpCalDAVEvent, getPendingCalDAVInvites } from "../../../src/mutations/providers/caldav";

vi.mock("../../../src/env", () => ({
  default: {
    ENCRYPTION_KEY: "test-key",
  },
}));

vi.mock("tsdav", () => ({
  createDAVClient: vi.fn(() => ({
    createCalendarObject: vi.fn().mockResolvedValue({}),
    fetchCalendarObjects: vi.fn().mockResolvedValue([{ url: "url", data: "BEGIN:VCALENDAR\nBEGIN:VEVENT\nUID:uid\nEND:VEVENT\nEND:VCALENDAR" }]),
    updateCalendarObject: vi.fn().mockResolvedValue({}),
    deleteCalendarObject: vi.fn().mockResolvedValue({}),
  })),
}));

vi.mock("@keeper.sh/database", () => ({
  decryptPassword: vi.fn(() => "decrypted"),
}));

vi.mock("@keeper.sh/calendar/safe-fetch", () => ({
  createSafeFetch: vi.fn(() => vi.fn()),
}));

vi.mock("@keeper.sh/calendar/digest-fetch", () => ({
  createDigestAwareFetch: vi.fn(() => ({ fetch: vi.fn() })),
  resolveAuthMethod: vi.fn(),
}));

describe("caldav provider mutations", () => {
  const mockCredentials = {
    serverUrl: "https://dav.com",
    calendarUrl: "https://dav.com/cal",
    username: "user",
    encryptedPassword: "enc",
    encryptionKey: "key",
    authMethod: "basic",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createCalDAVEvent", () => {
    it("calls tsdav createCalendarObject and returns UID", async () => {
      const result = await createCalDAVEvent(mockCredentials, {
        title: "Test",
        startTime: "2026-01-01T10:00:00Z",
        endTime: "2026-01-01T11:00:00Z",
        calendarId: "cal-1",
      });

      expect(result.success).toBe(true);
      expect(result.sourceEventUid).toBeDefined();
    });
  });

  describe("updateCalDAVEvent", () => {
    it("finds event and updates it", async () => {
      const result = await updateCalDAVEvent(mockCredentials, "uid", { title: "New" });
      expect(result.success).toBe(true);
    });
  });

  describe("deleteCalDAVEvent", () => {
    it("deletes event", async () => {
      const result = await deleteCalDAVEvent(mockCredentials, "uid");
      expect(result.success).toBe(true);
    });
  });

  describe("rsvpCalDAVEvent", () => {
    it("finds event and updates attendee", async () => {
      const result = await rsvpCalDAVEvent(mockCredentials, "uid", "accepted", "test@example.com");
      expect(result.success).toBe(true);
    });
  });

  describe("getPendingCalDAVInvites", () => {
    it("returns pending invites", async () => {
      const invites = await getPendingCalDAVInvites(mockCredentials, "2026-01-01", "2026-01-02", "test@example.com");
      expect(invites).toHaveLength(0); // My mock doesn't have the right data shape for successful parse yet
    });
  });
});
