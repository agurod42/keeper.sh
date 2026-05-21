import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/routes/api/webhook/polar";
import * as webhooks from "@polar-sh/sdk/webhooks";
import { database } from "@/context";

vi.mock("@polar-sh/sdk/webhooks", () => ({
  validateEvent: vi.fn(),
  WebhookVerificationError: class extends Error {},
}));

vi.mock("@/env", () => ({
  default: {
    POLAR_WEBHOOK_SECRET: "secret",
  },
}));

describe("polar webhook route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles subscription created", async () => {
    (webhooks.validateEvent as any).mockReturnValue({
      type: "subscription.created",
      data: {
        id: "sub-1",
        customer: { externalId: "u1" },
      },
    });

    const request = new Request("http://localhost:3000/api/webhook/polar", {
      method: "POST",
      body: "body",
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(database.insert).toHaveBeenCalled();
  });

  it("handles subscription updated", async () => {
    (webhooks.validateEvent as any).mockReturnValue({
      type: "subscription.updated",
      data: {
        id: "sub-1",
        status: "active",
        customer: { externalId: "u1" },
      },
    });

    const request = new Request("http://localhost:3000/api/webhook/polar", {
      method: "POST",
      body: "body",
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
  });

  it("returns 401 on invalid signature", async () => {
    (webhooks.validateEvent as any).mockImplementation(() => {
      throw new webhooks.WebhookVerificationError("Invalid");
    });

    const request = new Request("http://localhost:3000/api/webhook/polar", {
      method: "POST",
      body: "body",
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
  });
});
