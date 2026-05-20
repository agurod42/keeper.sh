import { describe, it, expect, vi } from "vitest";

vi.mock("../../../../src/core/oauth/accounts", () => ({
  getOAuthAccountsByPlan: vi.fn(),
  getOAuthAccountsForUser: vi.fn(),
  getUserEventsForSync: vi.fn(),
}));

import { getZohoAccountsByPlan, getZohoAccountsForUser, getUserEvents } from "../../../../src/providers/zoho/destination/sync";
import * as accounts from "../../../../src/core/oauth/accounts";

describe("Zoho sync utils", () => {
  it("getZohoAccountsByPlan calls getOAuthAccountsByPlan", async () => {
    await getZohoAccountsByPlan({} as any, "pro");
    expect(accounts.getOAuthAccountsByPlan).toHaveBeenCalledWith(expect.anything(), "zoho", "pro");
  });

  it("getZohoAccountsForUser calls getOAuthAccountsForUser", async () => {
    await getZohoAccountsForUser({} as any, "u1");
    expect(accounts.getOAuthAccountsForUser).toHaveBeenCalledWith(expect.anything(), "zoho", "u1");
  });

  it("getUserEvents calls getUserEventsForSync", async () => {
    await getUserEvents({} as any, "u1");
    expect(accounts.getUserEventsForSync).toHaveBeenCalledWith(expect.anything(), "u1");
  });
});
