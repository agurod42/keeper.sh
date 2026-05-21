import { describe, it, expect, vi } from "vitest";
import { createDatabase } from "../../src/utils/database";

vi.mock("drizzle-orm/bun-sql", () => ({
  drizzle: vi.fn(() => ({
    execute: vi.fn().mockResolvedValue([]),
    $client: { close: vi.fn() },
  })),
}));

describe("database utils", () => {
  it("creates database and waits for connection", async () => {
    const db = await createDatabase("postgres://localhost:5432/db");
    expect(db).toBeDefined();
    expect(db.execute).toHaveBeenCalledWith("SELECT 1");
  });

  it("retries connection on failure", async () => {
    const { drizzle } = await import("drizzle-orm/bun-sql");
    const mockDb = (drizzle as any)();
    (drizzle as any).mockReturnValue(mockDb);

    mockDb.execute
      .mockRejectedValueOnce(new Error("Fail"))
      .mockResolvedValueOnce([]);

    await createDatabase("postgres://localhost:5432/db");

    expect(mockDb.execute).toHaveBeenCalledTimes(2);
  });
});
