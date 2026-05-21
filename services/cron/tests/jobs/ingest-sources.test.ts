import { describe, it, expect, vi, beforeEach } from "vitest";

const mockQuery = {
  from: vi.fn().mockReturnThis(),
  innerJoin: vi.fn().mockReturnThis(),
  leftJoin: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  then: vi.fn((cb) => Promise.resolve([]).then(cb)),
};

vi.mock("../../src/context", () => ({
  database: {
    select: vi.fn(() => mockQuery),
    transaction: vi.fn(async (cb) => cb({
      delete: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn().mockResolvedValue(undefined),
      })),
    })),
  },
  refreshLockRedis: {},
  refreshLockStore: {},
}));

vi.mock("@keeper.sh/calendar", () => ({
  createRedisRateLimiter: vi.fn(),
  allSettledWithConcurrency: vi.fn(async (tasks) => Promise.allSettled(tasks.map((t: any) => t()))),
  ingestSource: vi.fn(),
  insertEventStatesWithConflictResolution: vi.fn(),
  createGoogleTokenRefresher: vi.fn(),
  createMicrosoftTokenRefresher: vi.fn(),
  createCoordinatedRefresher: vi.fn(),
  ensureValidToken: vi.fn(),
}));

vi.mock("@keeper.sh/calendar/ics", () => ({
  createIcsSourceFetcher: vi.fn(() => ({
    fetchEvents: vi.fn().mockResolvedValue({ events: [] }),
  })),
}));

vi.mock("@keeper.sh/calendar/caldav", () => ({
  createCalDAVSourceFetcher: vi.fn(() => ({
    fetchEvents: vi.fn().mockResolvedValue({ events: [] }),
  })),
  isCalDAVAuthenticationError: vi.fn(() => false),
}));

vi.mock("@keeper.sh/database", () => ({
  decryptPassword: vi.fn(() => "decrypted"),
}));

vi.mock("../../src/utils/logging", () => ({
  context: vi.fn((cb) => cb()),
  widelog: {
    set: vi.fn(),
    time: {
      measure: vi.fn(async (_, cb) => cb()),
    },
    errorFields: vi.fn(),
    flush: vi.fn(),
  },
}));

vi.mock("../../src/env", () => ({
  default: {
    INGEST_OAUTH_SOURCES_ENABLED: true,
    INGEST_CALDAV_SOURCES_ENABLED: true,
    INGEST_ICS_SOURCES_ENABLED: true,
    ENCRYPTION_KEY: "test-key",
  },
}));

import { ingestOAuthSources, ingestCalDAVSources, ingestIcsSources } from "../../src/jobs/ingest-sources";
import { ingestSource } from "@keeper.sh/calendar";

describe("ingest-sources jobs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ingestOAuthSources", () => {
    it("processes sources successfully", async () => {
      const mockSource = {
        accountId: "acc-1",
        calendarId: "cal-1",
        provider: "google",
        externalCalendarId: "ext-cal-1",
        syncToken: "token-1",
        oauthCredentialId: "cred-1",
        accessToken: "at",
        refreshToken: "rt",
        expiresAt: new Date(),
        userId: "user-1",
      };
      
      mockQuery.then.mockImplementationOnce((cb) => Promise.resolve([mockSource]).then(cb));

      (ingestSource as any).mockImplementation(async (options: any) => {
        options.onIngestEvent?.({ some: "event" });
        return { eventsAdded: 5, eventsRemoved: 2 };
      });

      const result = await ingestOAuthSources();

      expect(result.added).toBe(5);
      expect(result.removed).toBe(2);
    });

    it("handles 404 error by disabling calendar", async () => {
      const mockSource = {
        accountId: "acc-1",
        calendarId: "cal-1",
        provider: "google",
        externalCalendarId: "ext-cal-1",
        syncToken: "token-1",
        oauthCredentialId: "cred-1",
        accessToken: "at",
        refreshToken: "rt",
        expiresAt: new Date(),
        userId: "user-1",
      };
      
      mockQuery.then.mockImplementationOnce((cb) => Promise.resolve([mockSource]).then(cb));

      const error = new Error("Not found") as any;
      error.status = 404;
      (ingestSource as any).mockRejectedValue(error);

      const result = await ingestOAuthSources();

      expect(result.errors).toBe(0); // 404 is handled and returns { added: 0, ... }
      expect(result.added).toBe(0);
    });
  });

  describe("ingestCalDAVSources", () => {
    it("processes CalDAV sources successfully", async () => {
      const mockSource = {
        accountId: "acc-1",
        calendarId: "cal-1",
        calendarUrl: "url-1",
        provider: "caldav",
        username: "user",
        encryptedPassword: "enc",
        serverUrl: "server",
        userId: "u1",
      };
      mockQuery.then.mockImplementationOnce((cb) => Promise.resolve([mockSource]).then(cb));

      (ingestSource as any).mockImplementation(async (options: any) => {
        options.onIngestEvent?.({ some: "event" });
        return { eventsAdded: 3, eventsRemoved: 1 };
      });

      const result = await ingestCalDAVSources();

      expect(result.added).toBe(3);
      expect(result.removed).toBe(1);
    });
  });

  describe("ingestIcsSources", () => {
    it("processes Ics sources successfully", async () => {
      const mockSource = {
        calendarId: "cal-1",
        url: "url-1",
        userId: "u1",
      };
      mockQuery.then.mockImplementationOnce((cb) => Promise.resolve([mockSource]).then(cb));

      (ingestSource as any).mockImplementation(async (options: any) => {
        options.onIngestEvent?.({ some: "event" });
        return { eventsAdded: 10, eventsRemoved: 0 };
      });

      const result = await ingestIcsSources();

      expect(result.added).toBe(10);
    });
  });
});
