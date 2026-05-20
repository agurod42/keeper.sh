import { describe, it, expect, vi, beforeEach } from "vitest";
import { processJob } from "../src/processor";
import { syncDestinationsForUser } from "@keeper.sh/sync";
import { widelog } from "../src/utils/logging";

vi.mock("@keeper.sh/sync", () => ({
  syncDestinationsForUser: vi.fn(),
}));

vi.mock("../src/context", () => ({
  database: {
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        onConflictDoUpdate: vi.fn(),
      })),
    })),
  },
  refreshLockRedis: {
    publish: vi.fn(),
  },
  refreshLockStore: {},
}));

vi.mock("../src/utils/logging", () => ({
  context: vi.fn((cb) => cb()),
  widelog: {
    set: vi.fn().mockReturnThis(),
    sticky: vi.fn().mockReturnThis(),
    errors: vi.fn().mockReturnThis(),
    error: vi.fn().mockReturnThis(),
    errorFields: vi.fn().mockReturnThis(),
    append: vi.fn().mockReturnThis(),
    flush: vi.fn().mockReturnThis(),
  },
}));

vi.mock("../src/env", () => ({
  default: {
    ENCRYPTION_KEY: "test-key",
    GOOGLE_CLIENT_ID: "g-id",
    GOOGLE_CLIENT_SECRET: "g-secret",
    MICROSOFT_CLIENT_ID: "m-id",
    MICROSOFT_CLIENT_SECRET: "m-secret",
  },
}));

describe("processJob", () => {
  const mockJob = {
    id: "job-1",
    name: "sync",
    data: {
      userId: "user-1",
      plan: "pro",
      correlationId: "corr-1",
    },
    updateProgress: vi.fn(),
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("completes successfully and returns results", async () => {
    const mockResult = {
      added: 5,
      addFailed: 0,
      removed: 2,
      removeFailed: 0,
      errors: [],
    };
    (syncDestinationsForUser as any).mockImplementation(async (_userId, _opts, callbacks) => {
      if (callbacks?.onCalendarComplete) {
        callbacks.onCalendarComplete({
          provider: "google",
          accountId: "acc-1",
          calendarId: "cal-1",
          added: 5,
          addFailed: 0,
          removed: 2,
          removeFailed: 0,
          conflictsResolved: 0,
          durationMs: 100,
          errors: [],
        });
      }
      return mockResult;
    });

    const result = await processJob(mockJob, undefined, undefined);

    expect(result).toEqual(mockResult);
    expect(syncDestinationsForUser).toHaveBeenCalledWith("user-1", expect.anything(), expect.anything());
    expect(widelog.set).toHaveBeenCalledWith("outcome", "success");
    expect(widelog.flush).toHaveBeenCalled();
  });

  it("handles partial success in onCalendarComplete", async () => {
    const mockResult = { added: 1, addFailed: 1, removed: 0, removeFailed: 0, errors: ["unknown-error"] };
    (syncDestinationsForUser as any).mockImplementation(async (_userId, _opts, callbacks) => {
      if (callbacks?.onCalendarComplete) {
        callbacks.onCalendarComplete({
          provider: "google",
          accountId: "acc-1",
          calendarId: "cal-1",
          added: 1,
          addFailed: 1,
          removed: 0,
          removeFailed: 0,
          conflictsResolved: 0,
          durationMs: 100,
          errors: ["unknown-error"],
        });
      }
      return mockResult;
    });

    await processJob(mockJob, undefined, undefined);

    expect(widelog.set).toHaveBeenCalledWith("outcome", "partial");
    expect(widelog.append).toHaveBeenCalledWith("sync.error_samples", "unknown-error");
  });

  it("handles full error in onCalendarComplete", async () => {
    (syncDestinationsForUser as any).mockImplementation(async (_userId, _opts, callbacks) => {
      if (callbacks?.onCalendarComplete) {
        callbacks.onCalendarComplete({
          provider: "google",
          accountId: "acc-1",
          calendarId: "cal-1",
          added: 0,
          addFailed: 1,
          removed: 0,
          removeFailed: 0,
          conflictsResolved: 0,
          durationMs: 100,
          errors: ["429"],
        });
      }
      return { added: 0, addFailed: 1, removed: 0, removeFailed: 0, errors: ["429"] };
    });

    await processJob(mockJob, undefined, undefined);

    expect(widelog.set).toHaveBeenCalledWith("outcome", "error");
  });

  it("calls updateProgress on progress updates", async () => {
    (syncDestinationsForUser as any).mockImplementation(async (_userId, _opts, callbacks) => {
      if (callbacks?.onProgress) {
        callbacks.onProgress({
          calendarId: "cal-1",
          stage: "fetching",
          progress: 50,
        });
      }
      return { added: 0, addFailed: 0, removed: 0, removeFailed: 0, errors: [] };
    });

    await processJob(mockJob, undefined, undefined);

    expect(mockJob.updateProgress).toHaveBeenCalledWith({
      calendarId: "cal-1",
      stage: "fetching",
      progress: 50,
    });
  });

  it("calls syncAggregateRuntime.onDestinationSync on sync events", async () => {
    (syncDestinationsForUser as any).mockImplementation(async (_userId, _opts, callbacks) => {
      if (callbacks?.onSyncEvent) {
        callbacks.onSyncEvent({
          "calendar.id": "cal-1",
          "local_events.count": 10,
          "remote_events.count": 12,
        });
      }
      return { added: 0, addFailed: 0, removed: 0, removeFailed: 0, errors: [] };
    });

    await processJob(mockJob, undefined, undefined);
  });

  it("handles errors and rethrows", async () => {
    const error = new Error("Sync failed");
    (syncDestinationsForUser as any).mockRejectedValue(error);

    await expect(processJob(mockJob, undefined, undefined)).rejects.toThrow("Sync failed");

    expect(widelog.set).toHaveBeenCalledWith("outcome", "error");
    expect(widelog.errorFields).toHaveBeenCalledWith(error, { slug: "push-sync-failed" });
  });
});
