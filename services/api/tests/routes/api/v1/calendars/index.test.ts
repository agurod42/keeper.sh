import { describe, it, expect, vi } from "vitest";

const { mockKeeperApi } = vi.hoisted(() => ({
  mockKeeperApi: {
    listSources: vi.fn(),
  },
}));

vi.mock("@/utils/middleware", () => ({
  withV1Auth: (handler: any) => handler,
  withWideEvent: (handler: any) => handler,
}));

vi.mock("@/context", () => ({
  database: {},
}));

vi.mock("@/read-models", () => ({
  createKeeperApi: vi.fn(() => mockKeeperApi),
}));

import { GET } from "@/routes/api/v1/calendars/index";

describe("v1 calendars route", () => {
  it("returns list of calendars", async () => {
    const mockSources = [
      { id: "s1", name: "Source 1", providerName: "Google", accountLabel: "test@gmail.com", provider: "google" },
    ];
    mockKeeperApi.listSources.mockResolvedValue(mockSources);

    const request = new Request("http://localhost:3000/api/v1/calendars");
    const response = await GET({ request, userId: "user-1" } as any);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([
      { id: "s1", name: "Source 1", provider: "Google", account: "test@gmail.com" },
    ]);
  });
});
