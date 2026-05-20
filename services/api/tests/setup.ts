import { vi } from "vitest";

vi.mock("@/env", () => ({
  default: {
    API_PORT: 3000,
    BETTER_AUTH_SECRET: "secret",
    BETTER_AUTH_URL: "http://localhost:3000",
    DATABASE_URL: "postgres://localhost",
    REDIS_URL: "redis://localhost",
  },
}));

vi.mock("@keeper.sh/database", () => ({
  createDatabase: vi.fn().mockResolvedValue({}),
  closeDatabase: vi.fn(),
}));
