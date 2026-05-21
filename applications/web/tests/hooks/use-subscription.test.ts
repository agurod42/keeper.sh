import { describe, it, expect } from "vitest";
import { resolveSubscriptionState } from "../../src/hooks/use-subscription";

describe("use-subscription utils", () => {
  describe("resolveSubscriptionState", () => {
    it("returns free if no active subscriptions", () => {
      expect(resolveSubscriptionState({})).toEqual({ plan: "free", interval: null });
      expect(resolveSubscriptionState({ activeSubscriptions: [] })).toEqual({ plan: "free", interval: null });
    });

    it("returns pro with month interval", () => {
      expect(resolveSubscriptionState({ activeSubscriptions: [{ recurringInterval: "month" }] })).toEqual({
        plan: "pro",
        interval: "month",
      });
    });

    it("returns pro with year interval", () => {
      expect(resolveSubscriptionState({ activeSubscriptions: [{ recurringInterval: "year" }] })).toEqual({
        plan: "pro",
        interval: "year",
      });
    });
  });
});
