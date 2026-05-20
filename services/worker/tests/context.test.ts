import { describe, it, expect, vi } from "vitest";

// Mock env BEFORE importing anything that might use it
vi.mock("../src/env", () => ({
  default: {
    DATABASE_URL: "postgres://localhost",
    REDIS_URL: "redis://localhost",
  },
}));

const { mockRedis } = vi.hoisted(() => {
  return {
    mockRedis: {
      set: vi.fn(),
      del: vi.fn(),
      disconnect: vi.fn(),
    }
  };
});

vi.mock("ioredis", () => {
  return {
    default: vi.fn().mockImplementation(function() {
      return mockRedis;
    }),
  };
});

vi.mock("@keeper.sh/database", () => ({
  createDatabase: vi.fn().mockResolvedValue({}),
}));

import { refreshLockStore, shutdownConnections } from "../src/context";

describe("context", () => {
  it("tryAcquire returns true on success", async () => {
    mockRedis.set.mockResolvedValue("OK");
    const result = await refreshLockStore.tryAcquire("test-key", 60);
    expect(result).toBe(true);
    expect(mockRedis.set).toHaveBeenCalledWith("test-key", "1", "EX", 60, "NX");
  });

  it("tryAcquire returns false on failure", async () => {
    mockRedis.set.mockResolvedValue(null);
    const result = await refreshLockStore.tryAcquire("test-key", 60);
    expect(result).toBe(false);
  });

  it("release calls del", async () => {
    await refreshLockStore.release("test-key");
    expect(mockRedis.del).toHaveBeenCalledWith("test-key");
  });

  it("shutdownConnections calls disconnect", () => {
    shutdownConnections();
    expect(mockRedis.disconnect).toHaveBeenCalled();
  });
});
