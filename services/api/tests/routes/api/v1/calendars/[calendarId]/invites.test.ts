import { describe, it, expect, vi } from "vitest";

const { mockKeeperApi } = vi.hoisted(() => ({
  mockKeeperApi: {
    getPendingInvites: vi.fn(),
  },
}));

vi.mock("@/read-models", () => ({
  createKeeperApi: vi.fn(() => mockKeeperApi),
}));

import { GET } from "@/routes/api/v1/calendars/[calendarId]/invites";

describe("v1 calendar invites route", () => {
  it("returns list of invites", async () => {
    mockKeeperApi.getPendingInvites.mockResolvedValue([{ title: "Invite 1" }]);
    const request = new Request("http://localhost:3000/api/v1/calendars/c1/invites");
    const response = await GET({ request, userId: "u1", params: { calendarId: "c1" } } as any);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([{ title: "Invite 1" }]);
  });
});
