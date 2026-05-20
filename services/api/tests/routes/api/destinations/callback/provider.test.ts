import { describe, it, expect, vi } from "vitest";

vi.mock("@/utils/middleware", () => ({
  withWideEvent: (handler: any) => handler,
}));

vi.mock("@/context", () => ({
  baseUrl: "http://localhost:3000",
}));

vi.mock("@/utils/oauth", () => ({
  parseOAuthCallback: vi.fn(),
  handleOAuthCallback: vi.fn(),
  buildRedirectUrl: vi.fn(() => "http://error-url"),
  OAuthError: class extends Error {
    constructor(message: string, public redirectUrl: string) {
      super(message);
    }
  },
}));

import { GET } from "@/routes/api/destinations/callback/[provider]";
import * as oauth from "@/utils/oauth";

describe("destination callback route", () => {
  it("redirects to success URL on valid callback", async () => {
    (oauth.parseOAuthCallback as any).mockReturnValue({ code: "code", state: "state", provider: "google" });
    (oauth.handleOAuthCallback as any).mockResolvedValue({ redirectUrl: "http://success-url" });

    const request = new Request("http://localhost:3000/api/destinations/callback/google?code=code-1&state=state-1");
    const response = await GET({ request, params: { provider: "google" } } as any);

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("http://success-url");
  });

  it("handles OAuthError by redirecting to its redirectUrl", async () => {
    (oauth.parseOAuthCallback as any).mockImplementation(() => {
      throw new (oauth.OAuthError as any)("Error", "http://error-url-from-exception");
    });

    const request = new Request("http://localhost:3000/api/destinations/callback/google");
    const response = await GET({ request, params: { provider: "google" } } as any);

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("http://error-url-from-exception");
  });
});
