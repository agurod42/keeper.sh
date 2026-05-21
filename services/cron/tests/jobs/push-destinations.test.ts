import { describe, it, expect, vi, beforeEach } from "vitest";
import { runEgressJob } from "../../src/jobs/push-destinations";
import { createPushSyncQueue } from "@keeper.sh/queue";
import { getUsersWithDestinationsByPlan } from "../../src/utils/get-sources";

vi.mock("@keeper.sh/queue", () => ({
  createPushSyncQueue: vi.fn(() => ({
    addBulk: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock("../../src/utils/get-sources", () => ({
  getUsersWithDestinationsByPlan: vi.fn(),
}));

vi.mock("../../src/utils/logging", () => ({
  widelog: {
    set: vi.fn(),
  },
}));

vi.mock("../../src/env", () => ({
  default: {
    WORKER_JOB_QUEUE_ENABLED: true,
    REDIS_URL: "redis://localhost",
  },
}));

describe("runEgressJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("enqueues jobs for users with destinations", async () => {
    (getUsersWithDestinationsByPlan as any).mockResolvedValue(["user-1", "user-2"]);
    const mockQueue = (createPushSyncQueue as any)();
    (createPushSyncQueue as any).mockReturnValue(mockQueue);

    await runEgressJob("pro");

    expect(getUsersWithDestinationsByPlan).toHaveBeenCalledWith("pro");
    expect(mockQueue.addBulk).toHaveBeenCalledWith([
      expect.objectContaining({ name: "sync-user-1", data: expect.objectContaining({ userId: "user-1", plan: "pro" }) }),
      expect.objectContaining({ name: "sync-user-2", data: expect.objectContaining({ userId: "user-2", plan: "pro" }) }),
    ]);
    expect(mockQueue.close).toHaveBeenCalled();
  });

  it("does nothing if no users have destinations", async () => {
    (getUsersWithDestinationsByPlan as any).mockResolvedValue([]);
    
    await runEgressJob("free");

    expect(createPushSyncQueue).not.toHaveBeenCalled();
  });

  it("does nothing if queue is disabled", async () => {
    const env = await import("../../src/env");
    (env.default as any).WORKER_JOB_QUEUE_ENABLED = false;

    await runEgressJob("pro");

    expect(getUsersWithDestinationsByPlan).not.toHaveBeenCalled();
    
    (env.default as any).WORKER_JOB_QUEUE_ENABLED = true;
  });
});
