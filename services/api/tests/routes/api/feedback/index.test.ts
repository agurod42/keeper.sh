import { describe, it, expect, vi } from "vitest";
import { POST } from "@/routes/api/feedback/index";
import { database, resend } from "@/context";

describe("feedback route", () => {
  it("sends feedback successfully", async () => {
    const body = {
      message: "Great app!",
      type: "feedback",
      wantsFollowUp: true,
    };
    const request = new Request("http://localhost:3000/api/feedback", {
      method: "POST",
      body: JSON.stringify(body),
    });

    (database.select as any).mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ email: "user@example.com" }]),
    });

    const response = await POST({ request, userId: "u1" } as any);

    expect(response.status).toBe(200);
    expect(resend.emails.send).toHaveBeenCalled();
  });
});
