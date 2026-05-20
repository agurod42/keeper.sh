import { describe, it, expect, vi } from "vitest";

vi.mock("@/utils/middleware", () => ({
  withWideEvent: (handler: any) => handler,
}));

vi.mock("@/context", () => ({
  baseUrl: "http://localhost:3000",
}));

vi.mock("@/utils/destinations", () => ({
  validateState: vi.fn(),
  exchangeCodeForTokens: vi.fn(),
  fetchUserInfo: vi.fn(),
  buildCredentialMetadata: vi.fn(),
}));

vi.mock("@/utils/oauth-source-credentials", () => ({
  createOAuthSourceCredential: vi.fn(),
}));

vi.mock("@/utils/oauth-sources", () => ({
  importOAuthAccountCalendars: vi.fn(),
}));

import { GET } from "@/routes/api/sources/callback/[provider]";
import * as destinations from "@/utils/destinations";

describe("google source callback route", () => {
  it("redirects to success URL on valid callback", async () => {
    (destinations.validateState as any).mockResolvedValue({ userId: "user-1" });
    (destinations.exchangeCodeForTokens as any).mockResolvedValue({ access_token: "at", refresh_token: "rt", expires_in: 3600 });
    (destinations.fetchUserInfo as any).mockResolvedValue({ email: "test@example.com" });

    const request = new Request("http://localhost:3000/api/sources/callback/google?code=code-1&state=state-1");
    const response = await GET({ request, params: { provider: "google" } } as any);

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toContain("/dashboard/accounts/");
  });

  it("redirects to error URL on invalid state", async () => {
    (destinations.validateState as any).mockResolvedValue(null);

    const request = new Request("http://localhost:3000/api/sources/callback/google?code=code-1&state=state-1");
    const response = await GET({ request, params: { provider: "google" } } as any);

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toContain("error=Failed+to+connect+source");
  });
});
