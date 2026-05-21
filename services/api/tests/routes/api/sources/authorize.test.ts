import { describe, it, expect, vi } from "vitest";
import { GET } from "@/routes/api/sources/authorize";
import * as destinations from "@/utils/destinations";
import { database } from "@/context";

vi.mock("@/utils/destinations", () => ({
  getAuthorizationUrl: vi.fn(),
  isOAuthProvider: vi.fn(),
}));

describe("sources authorize route", () => {
  it("redirects to provider auth URL", async () => {
    (destinations.isOAuthProvider as any).mockReturnValue(true);
    (destinations.getAuthorizationUrl as any).mockResolvedValue("http://google.com/auth");

    const request = new Request("http://localhost:3000/api/sources/authorize?provider=google");
    const response = await GET({ request, userId: "u1" } as any);

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("http://google.com/auth");
  });

  it("checks credential ownership if provided", async () => {
    (destinations.isOAuthProvider as any).mockReturnValue(true);
    (database.select as any).mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    });

    const request = new Request("http://localhost:3000/api/sources/authorize?provider=google&credentialId=c1");
    const response = await GET({ request, userId: "u1" } as any);

    expect(response.status).toBe(404);
  });
});
