import { describe, it, expect, vi } from "vitest";
import { createRedisGenerationCheck } from "../../../src/core/sync-engine/generation";

describe("createRedisGenerationCheck", () => {
  it("returns true when generation matches", async () => {
    const mockStore = {
      incr: vi.fn().mockResolvedValue(1),
      get: vi.fn().mockResolvedValue("1"),
      expire: vi.fn().mockResolvedValue(1),
    };

    const isCurrent = await createRedisGenerationCheck(mockStore, "c1");
    expect(await isCurrent()).toBe(true);
    expect(mockStore.incr).toHaveBeenCalled();
  });

  it("returns false when generation changes", async () => {
    const mockStore = {
      incr: vi.fn().mockResolvedValue(1),
      get: vi.fn().mockResolvedValue("2"),
      expire: vi.fn().mockResolvedValue(1),
    };

    const isCurrent = await createRedisGenerationCheck(mockStore, "c1");
    expect(await isCurrent()).toBe(false);
  });

  it("returns false when store returns null", async () => {
    const mockStore = {
      incr: vi.fn().mockResolvedValue(1),
      get: vi.fn().mockResolvedValue(null),
      expire: vi.fn().mockResolvedValue(1),
    };

    const isCurrent = await createRedisGenerationCheck(mockStore, "c1");
    expect(await isCurrent()).toBe(false);
  });
});
