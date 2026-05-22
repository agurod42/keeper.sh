import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveZohoRegion, buildProviderMetadata, hasRequiredScopes } from "../../../src/core/oauth/zoho";

describe("zoho oauth utils", () => {
  describe("resolveZohoRegion", () => {
    it("returns region if valid", () => {
      expect(resolveZohoRegion("eu")).toBe("eu");
    });

    it("returns default region if invalid", () => {
      expect(resolveZohoRegion("invalid")).toBe("us");
      expect(resolveZohoRegion(null)).toBe("us");
    });
  });

  describe("buildProviderMetadata", () => {
    it("includes region and api base", () => {
      const metadata = buildProviderMetadata("eu");
      expect(metadata.region).toBe("eu");
      expect(metadata.calendarApiBase).toContain("zoho.eu");
    });
  });

  describe("hasRequiredScopes", () => {
    it("returns true if all required scopes are present", () => {
      expect(hasRequiredScopes("ZohoCalendar.calendar.ALL, ZohoCalendar.event.ALL")).toBe(true);
    });

    it("returns false if missing required scope", () => {
      expect(hasRequiredScopes("ZohoCalendar.calendar.ALL")).toBe(false);
    });
  });
});
