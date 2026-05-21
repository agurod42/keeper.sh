import { describe, it, expect, vi } from "vitest";
import { GET } from "@/routes/api/sources/zoho/calendars";
import { database } from "@/context";

vi.mock("@/utils/oauth-calendar-listing", () => ({
  listOAuthCalendars: vi.fn(() => Promise.resolve(Response.json([{ id: "c1" }]))),
}));

vi.mock("@keeper.sh/calendar", () => ({
  buildZohoProviderMetadata: vi.fn(),
  getZohoRegionFromMetadata: vi.fn(),
}));

describe("zoho sources calendars route", () => {
  it("calls listOAuthCalendars", async () => {
    (database.select as any).mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ providerMetadata: { region: "us" } }]),
    });

    const request = new Request("http://localhost:3000/api/sources/zoho/calendars?credentialId=c1");
    const response = await GET({ request, userId: "u1" } as any);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([{ id: "c1" }]);
  });
});
