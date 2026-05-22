import { describe, it, expect, vi } from "vitest";
import { computeSyncOperations } from "../../../src/core/sync/operations";

describe("sync operations", () => {
  const start = new Date("2026-05-20T10:00:00Z");
  const end = new Date("2026-05-20T11:00:00Z");

  it("computes adds for unmapped events", () => {
    const local = [{ id: "l1", summary: "Title", startTime: start, endTime: end }];
    const remote = [];
    const mappings = [];
    
    const result = computeSyncOperations(local as any, remote, mappings as any);
    expect(result.operations).toHaveLength(1);
    expect(result.operations[0].type).toBe("add");
  });

  it("computes removes for orphaned mappings", () => {
    const local = [];
    const remote = [{ uid: "r1", startTime: start, endTime: end }];
    const mappings = [{ id: "m1", eventStateId: "l1", destinationEventUid: "r1", startTime: start, endTime: end }];
    
    const result = computeSyncOperations(local, remote as any, mappings as any);
    expect(result.operations).toHaveLength(1);
    expect(result.operations[0].type).toBe("remove");
  });

  it("computes updates for changed events", () => {
    const local = [{ id: "l1", summary: "New Title", startTime: start, endTime: end }];
    const remote = [{ uid: "r1", title: "Old Title", startTime: start, endTime: end }];
    const mappings = [{ id: "m1", eventStateId: "l1", destinationEventUid: "r1", startTime: start, endTime: end }];
    
    const result = computeSyncOperations(local as any, remote as any, mappings as any);
    expect(result.operations).toHaveLength(2);
    expect(result.operations.some(o => o.type === "remove")).toBe(true);
    expect(result.operations.some(o => o.type === "add")).toBe(true);
  });
});
