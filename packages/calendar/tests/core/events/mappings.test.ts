import { describe, it, expect, vi } from "vitest";
import { createEventMapping, countMappingsForDestination } from "../../../src/core/events/mappings";

describe("event mappings", () => {
  const mockDb = {
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        onConflictDoNothing: vi.fn().mockResolvedValue([]),
      })),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn().mockResolvedValue([{ count: 5 }]),
      })),
    })),
  };

  it("createEventMapping calls insert", async () => {
    await createEventMapping(mockDb as any, {
      eventStateId: "es1",
      calendarId: "c1",
      destinationEventUid: "du1",
      startTime: new Date(),
      endTime: new Date(),
    });
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("countMappingsForDestination returns count", async () => {
    const count = await countMappingsForDestination(mockDb as any, "c1");
    expect(count).toBe(5);
  });

  it("getEventMappingsForDestination returns mappings", async () => {
    const { getEventMappingsForDestination } = await import("../../../src/core/events/mappings");
    const result = await getEventMappingsForDestination(mockDb as any, "c1");
    expect(result).toHaveLength(1);
  });

  it("deleteEventMapping calls delete", async () => {
    const { deleteEventMapping } = await import("../../../src/core/events/mappings");
    const localDb = { delete: vi.fn().mockReturnThis(), where: vi.fn().mockResolvedValue([]) };
    await deleteEventMapping(localDb as any, "m1");
    expect(localDb.delete).toHaveBeenCalled();
  });

  it("deleteEventMappingByDestinationUid calls delete", async () => {
    const { deleteEventMappingByDestinationUid } = await import("../../../src/core/events/mappings");
    const localDb = { delete: vi.fn().mockReturnThis(), where: vi.fn().mockResolvedValue([]) };
    await deleteEventMappingByDestinationUid(localDb as any, "c1", "r1");
    expect(localDb.delete).toHaveBeenCalled();
  });
});
