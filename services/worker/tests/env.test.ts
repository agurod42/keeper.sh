import { describe, it, expect, vi } from "vitest";

vi.mock("arkenv", () => ({
  default: vi.fn(() => ({
    DATABASE_URL: "postgres://localhost",
    REDIS_URL: "redis://localhost",
  })),
}));

import env, { schema } from "../src/env";

describe("env", () => {
  it("exports schema and parsed env", () => {
    expect(schema).toBeDefined();
    expect(env.DATABASE_URL).toBe("postgres://localhost");
    expect(env.REDIS_URL).toBe("redis://localhost");
  });
});
