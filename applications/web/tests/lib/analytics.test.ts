import { describe, it, expect, vi, beforeEach } from "vitest";
import { track, setAnalyticsConsent, hasAnalyticsConsent } from "../../src/lib/analytics";

describe("analytics lib", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.cookie = "";
    globalThis.visitors = { track: vi.fn(), identify: vi.fn() };
    globalThis.gtag = vi.fn();
  });

  it("track calls visitors.track", () => {
    track("test_event", { foo: "bar" });
    expect(globalThis.visitors?.track).toHaveBeenCalledWith("test_event", { foo: "bar" });
  });

  it("setAnalyticsConsent sets cookie and updates gtag", () => {
    setAnalyticsConsent(true);
    expect(document.cookie).toContain("granted");
    expect(globalThis.gtag).toHaveBeenCalledWith("consent", "update", expect.anything());
    expect(hasAnalyticsConsent()).toBe(true);
  });
});
