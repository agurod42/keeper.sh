import { describe, it, expect, vi, beforeEach } from "vitest";
import { createEventMutation, updateEventMutation, deleteEventMutation, rsvpEventMutation, getPendingInvitesMutation } from "../../src/mutations/index";
import * as resolveCredentials from "../../src/mutations/resolve-credentials";
import * as googleProvider from "../../src/mutations/providers/google";
import * as outlookProvider from "../../src/mutations/providers/outlook";
import * as caldavProvider from "../../src/mutations/providers/caldav";

vi.mock("../../src/mutations/resolve-credentials", () => ({
  resolveCredentialsByCalendarId: vi.fn(),
  resolveCredentialsByEventId: vi.fn(),
}));

vi.mock("../../src/mutations/providers/google", () => ({
  createGoogleEvent: vi.fn(),
  updateGoogleEvent: vi.fn(),
  deleteGoogleEvent: vi.fn(),
  rsvpGoogleEvent: vi.fn(),
  getPendingGoogleInvites: vi.fn(),
}));

vi.mock("../../src/mutations/providers/outlook", () => ({
  createOutlookEvent: vi.fn(),
  updateOutlookEvent: vi.fn(),
  deleteOutlookEvent: vi.fn(),
  rsvpOutlookEvent: vi.fn(),
  getPendingOutlookInvites: vi.fn(),
}));

vi.mock("../../src/mutations/providers/caldav", () => ({
  createCalDAVEvent: vi.fn(),
  updateCalDAVEvent: vi.fn(),
  deleteCalDAVEvent: vi.fn(),
  rsvpCalDAVEvent: vi.fn(),
  getPendingCalDAVInvites: vi.fn(),
}));

describe("mutations index", () => {
  const mockDatabase = {
    select: vi.fn(() => ({
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ 
        id: "event-id",
        startTime: new Date(),
        endTime: new Date()
      }]),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn().mockResolvedValue([{ id: "new-event-id" }]),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn().mockResolvedValue(undefined),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn().mockResolvedValue(undefined),
    })),
  } as any;

  const mockDeps = {
    database: mockDatabase,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createEventMutation", () => {
    it("returns error if credentials not found", async () => {
      (resolveCredentials.resolveCredentialsByCalendarId as any).mockResolvedValue(null);

      const result = await createEventMutation(mockDeps, "user-1", "cal-1", { calendarId: "cal-1" } as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Calendar not found or requires reauthentication.");
    });

    it("refreshes token if expired", async () => {
      const mockCredentials = {
        provider: "google",
        oauth: { 
          expiresAt: new Date(Date.now() - 1000000), 
          accessToken: "old-at",
          refreshToken: "rt",
          credentialId: "oauth-1",
          accountId: "acc-1",
        },
      };
      (resolveCredentials.resolveCredentialsByCalendarId as any).mockResolvedValue(mockCredentials);
      (googleProvider.createGoogleEvent as any).mockResolvedValue({ success: true, sourceEventUid: "google-uid" });

      const mockRefresh = vi.fn().mockResolvedValue({ access_token: "new-at", expires_in: 3600 });
      const mockOauthRefresher = {
        getProvider: vi.fn().mockReturnValue({ refreshAccessToken: mockRefresh }),
      };
      const depsWithRefresher = { ...mockDeps, oauthTokenRefresher: mockOauthRefresher };

      const result = await createEventMutation(depsWithRefresher, "user-1", "cal-1", { calendarId: "cal-1", title: "Test" } as any);

      expect(result.success).toBe(true);
      expect(mockRefresh).toHaveBeenCalledWith("rt");
    });

    it("calls outlook provider for outlook calendar", async () => {
      const mockCredentials = {
        provider: "outlook",
        oauth: { expiresAt: new Date(Date.now() + 1000000), accessToken: "at" },
      };
      (resolveCredentials.resolveCredentialsByCalendarId as any).mockResolvedValue(mockCredentials);
      (outlookProvider.createOutlookEvent as any).mockResolvedValue({ success: true, sourceEventUid: "outlook-uid" });

      const result = await createEventMutation(mockDeps, "user-1", "cal-1", { calendarId: "cal-1", title: "Test" } as any);

      expect(result.success).toBe(true);
      expect(outlookProvider.createOutlookEvent).toHaveBeenCalled();
    });

    it("calls caldav provider for caldav calendar", async () => {
      const mockCredentials = {
        provider: "caldav",
        calendarUrl: "https://dav.com",
        caldav: { serverUrl: "https://dav.com" },
      };
      (resolveCredentials.resolveCredentialsByCalendarId as any).mockResolvedValue(mockCredentials);
      (caldavProvider.createCalDAVEvent as any).mockResolvedValue({ success: true, sourceEventUid: "caldav-uid" });

      const result = await createEventMutation({ ...mockDeps, encryptionKey: "key" }, "user-1", "cal-1", { calendarId: "cal-1", title: "Test" } as any);

      expect(result.success).toBe(true);
      expect(caldavProvider.createCalDAVEvent).toHaveBeenCalled();
    });
  });

  describe("updateEventMutation", () => {
    it("calls google provider for google calendar", async () => {
      const mockCredentials = {
        provider: "google",
        oauth: { expiresAt: new Date(Date.now() + 1000000), accessToken: "at" },
      };
      (resolveCredentials.resolveCredentialsByEventId as any).mockResolvedValue({ credentials: mockCredentials, sourceEventUid: "g-uid" });
      (googleProvider.updateGoogleEvent as any).mockResolvedValue({ success: true });

      const result = await updateEventMutation(mockDeps, "user-1", "event-1", { title: "New" } as any);

      expect(result.success).toBe(true);
      expect(googleProvider.updateGoogleEvent).toHaveBeenCalled();
    });
  });

  describe("deleteEventMutation", () => {
    it("calls google provider for google calendar", async () => {
      const mockCredentials = {
        provider: "google",
        oauth: { expiresAt: new Date(Date.now() + 1000000), accessToken: "at" },
      };
      (resolveCredentials.resolveCredentialsByEventId as any).mockResolvedValue({ credentials: mockCredentials, sourceEventUid: "g-uid" });
      (googleProvider.deleteGoogleEvent as any).mockResolvedValue({ success: true });

      const result = await deleteEventMutation(mockDeps, "user-1", "event-1");

      expect(result.success).toBe(true);
      expect(googleProvider.deleteGoogleEvent).toHaveBeenCalled();
    });
  });

  describe("rsvpEventMutation", () => {
    it("calls google provider for google calendar", async () => {
      const mockCredentials = {
        provider: "google",
        oauth: { expiresAt: new Date(Date.now() + 1000000), accessToken: "at" },
        email: "test@example.com",
      };
      (resolveCredentials.resolveCredentialsByEventId as any).mockResolvedValue({ credentials: mockCredentials, sourceEventUid: "g-uid" });
      (googleProvider.rsvpGoogleEvent as any).mockResolvedValue({ success: true });

      const result = await rsvpEventMutation(mockDeps, "user-1", "event-1", "accepted");

      expect(result.success).toBe(true);
      expect(googleProvider.rsvpGoogleEvent).toHaveBeenCalled();
    });
  });

  describe("getPendingInvitesMutation", () => {
    it("returns invites for calendar", async () => {
      const mockCredentials = {
        provider: "google",
        oauth: { expiresAt: new Date(Date.now() + 1000000), accessToken: "at" },
      };
      (resolveCredentials.resolveCredentialsByCalendarId as any).mockResolvedValue(mockCredentials);
      (googleProvider.getPendingGoogleInvites as any).mockResolvedValue([{ title: "Invite 1", startTime: new Date().toISOString() }]);

      const result = await getPendingInvitesMutation(mockDeps, "user-1", "cal-1", "2026-01-01", "2026-01-02");

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Invite 1");
    });
  });
});
