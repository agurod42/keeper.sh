import { describe, it, expect } from "vitest";
import { isHttpMethod, isRouteModule } from "../../src/utils/route-handler";

describe("route-handler utils", () => {
  it("isHttpMethod identifies valid methods", () => {
    expect(isHttpMethod("GET")).toBe(true);
    expect(isHttpMethod("PATCH")).toBe(false);
  });

  it("isRouteModule identifies valid modules", () => {
    expect(isRouteModule({ GET: () => {} })).toBe(true);
    expect(isRouteModule({})).toBe(false);
    expect(isRouteModule(null)).toBe(false);
  });
});
