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

vi.mock("@/context", () => ({
  database: {
    select: vi.fn(() => ({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    })),
    update: vi.fn().mockReturnThis(),
    insert: vi.fn(() => ({
      values: vi.fn().mockReturnThis(),
      onConflictDoUpdate: vi.fn().mockResolvedValue([]),
    })),
    delete: vi.fn().mockReturnThis(),
  },
  baseUrl: "http://localhost:3000",
  premiumService: {
    canAddAccount: vi.fn().mockResolvedValue(true),
    getUserPlan: vi.fn().mockResolvedValue("free"),
  },
  redis: {
    del: vi.fn(),
  },
  oauthProviders: {},
  refreshLockStore: {},
  encryptionKey: "key",
  resend: {
    emails: {
      send: vi.fn().mockResolvedValue({}),
    },
  },
  feedbackEmail: "feedback@keeper.sh",
}));

vi.mock("@/utils/middleware", () => ({
  withAuth: (handler: any) => handler,
  withV1Auth: (handler: any) => handler,
  withWideEvent: (handler: any) => handler,
}));
