import { describe, it, expect, vi } from "vitest";
import { getOutlookAccountsByPlan } from "../../../../src/providers/outlook/destination/sync";
import * as accounts from "../../../../src/core/oauth/accounts";

vi.mock("../../../../src/core/oauth/accounts", () => ({
  getOAuthAccountsByPlan: vi.fn(),
}));

describe("Outlook sync utils", () => {
  it("getOutlookAccountsByPlan calls core with correct provider", async () => {
    await getOutlookAccountsByPlan({} as any, "pro");
    expect(accounts.getOAuthAccountsByPlan).toHaveBeenCalledWith(expect.anything(), "outlook", "pro");
  });
});
