import { describe, it, expect, vi } from "vitest";

// Mock everything needed for index.ts
vi.mock("entrykit", () => ({
  entry: vi.fn(),
}));

vi.mock("bullmq", () => ({
  Worker: vi.fn().mockImplementation(function() {
    return {
      on: vi.fn(),
      close: vi.fn().mockResolvedValue(undefined),
    };
  }),
}));

vi.mock("@keeper.sh/database", () => ({
  closeDatabase: vi.fn(),
}));

vi.mock("./processor", () => ({
  processJob: vi.fn(),
  syncAggregateRuntime: {
    holdSyncing: vi.fn(),
    releaseSyncing: vi.fn(),
  },
}));

vi.mock("./utils/logging", () => ({
  destroy: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../src/env", () => ({
  default: {
    REDIS_URL: "redis://localhost",
    WORKER_CONCURRENCY: "10",
    DATABASE_URL: "postgres://localhost",
  },
}));

vi.mock("../src/context", () => ({
  database: {},
  shutdownConnections: vi.fn(),
  refreshLockRedis: {},
  refreshLockStore: {},
}));

import { entry } from "entrykit";
import "../src/index";

describe("worker index", () => {
  it("calls entry with worker configuration", () => {
    expect(entry).toHaveBeenCalledWith(expect.objectContaining({
      name: "worker",
      main: expect.any(Function),
    }));
  });

  it("main function sets up worker and returns cleanup", async () => {
    const main = (vi.mocked(entry).mock.calls[0][0] as any).main;
    const cleanup = await main();
    expect(cleanup).toBeInstanceOf(Function);
    
    await cleanup();
    const { shutdownConnections } = await import("../src/context");
    expect(shutdownConnections).toHaveBeenCalled();
  });
});
