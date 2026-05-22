import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRedisRateLimiter } from "../../../src/core/utils/redis-rate-limiter";

describe("RedisRateLimiter", () => {
  const mockRedis = {
    eval: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("acquires successfully", async () => {
    mockRedis.eval.mockResolvedValue(0);
    const limiter = createRedisRateLimiter(mockRedis as any, "test-key", { requestsPerMinute: 10 });
    
    await limiter.acquire(1);
    expect(mockRedis.eval).toHaveBeenCalled();
  });

  it("retries if rate limited", async () => {
    mockRedis.eval
      .mockResolvedValueOnce(100)
      .mockResolvedValueOnce(0);
    
    const limiter = createRedisRateLimiter(mockRedis as any, "test-key", { requestsPerMinute: 10 });
    await limiter.acquire(1);

    expect(mockRedis.eval).toHaveBeenCalledTimes(2);
  });
});
