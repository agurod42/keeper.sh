import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/routes/api/destinations/authorize";
import * as destinations from "@/utils/destinations";
import { database, premiumService } from "@/context";

vi.mock("@/utils/destinations", () => ({
  getAuthorizationUrl: vi.fn(),
  isOAuthProvider: vi.fn(),
}));

describe("destinations authorize route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to provider auth URL", async () => {
    (destinations.isOAuthProvider as any).mockReturnValue(true);
    (destinations.getAuthorizationUrl as any).mockResolvedValue("http://google.com/auth");
    (database.select as any).mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ value: 0 }]),
    });

    const request = new Request("http://localhost:3000/api/destinations/authorize?provider=google");
    const response = await GET({ request, userId: "u1" } as any);

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("http://google.com/auth");
  });

  it("checks account limit for new destinations", async () => {
    (destinations.isOAuthProvider as any).mockReturnValue(true);
    (premiumService.canAddAccount as any).mockResolvedValue(false);
    (database.select as any).mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ value: 5 }]),
    });

    const request = new Request("http://localhost:3000/api/destinations/authorize?provider=google");
    const response = await GET({ request, userId: "u1" } as any);

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toContain("error=Account+limit+reached");
  });
});
