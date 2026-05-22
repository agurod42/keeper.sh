import { describe, it, expect, vi } from "vitest";
import { allSettledWithConcurrency } from "../../../src/core/utils/concurrency";

describe("allSettledWithConcurrency", () => {
  it("executes tasks with limited concurrency", async () => {
    let active = 0;
    let maxActive = 0;
    
    const task = async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise(resolve => setTimeout(resolve, 10));
      active--;
      return "ok";
    };

    const tasks = Array.from({ length: 10 }, () => task);
    const results = await allSettledWithConcurrency(tasks, { concurrency: 2 });

    expect(results).toHaveLength(10);
    expect(maxActive).toBeLessThanOrEqual(2);
    expect(results.every(r => r.status === "fulfilled")).toBe(true);
  });

  it("handles rejections", async () => {
    const tasks = [
      async () => "ok",
      async () => { throw new Error("fail"); },
    ];
    const results = await allSettledWithConcurrency(tasks);
    expect(results[0].status).toBe("fulfilled");
    expect(results[1].status).toBe("rejected");
  });
});
