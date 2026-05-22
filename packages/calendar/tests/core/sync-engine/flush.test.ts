import { describe, it, expect, vi, beforeEach } from "vitest";
import { createDatabaseFlush, FLUSH_BATCH_SIZE } from "../../../src/core/sync-engine/flush";

describe("createDatabaseFlush", () => {
  const mockTransaction = {
    delete: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    onConflictDoNothing: vi.fn().mockReturnThis(),
  };

  const mockDatabase = {
    transaction: vi.fn(async (cb) => cb(mockTransaction)),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exports a batch size", () => {
    expect(FLUSH_BATCH_SIZE).toBeGreaterThan(0);
  });

  it("does nothing if no changes", async () => {
    const flush = createDatabaseFlush(mockDatabase as any);
    await flush({ inserts: [], deletes: [] });
    expect(mockDatabase.transaction).not.toHaveBeenCalled();
  });

  it("executes deletes and inserts in transaction", async () => {
    const flush = createDatabaseFlush(mockDatabase as any);
    const changes = {
      inserts: [
        {
          eventStateId: "es1",
          calendarId: "c1",
          destinationEventUid: "du1",
          deleteIdentifier: "d1",
          syncEventHash: "h1",
          startTime: new Date(),
          endTime: new Date(),
        },
      ],
      deletes: ["m1"],
    };

    await flush(changes);

    expect(mockDatabase.transaction).toHaveBeenCalled();
    expect(mockTransaction.delete).toHaveBeenCalled();
    expect(mockTransaction.insert).toHaveBeenCalled();
  });
});
