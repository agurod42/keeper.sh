import { describe, it, expect } from "vitest";
import { canonicalUrl, seoMeta } from "../../src/lib/seo";

describe("seo lib", () => {
  it("canonicalUrl returns full URL", () => {
    expect(canonicalUrl("/test")).toBe("https://keeper.sh/test");
  });

  it("seoMeta returns array of tags", () => {
    const meta = seoMeta({ title: "Test", description: "Desc", path: "/test" });
    expect(meta).toContainEqual({ title: "Test · Keeper.sh" });
    expect(meta).toContainEqual({ content: "Desc", name: "description" });
    expect(meta).toContainEqual({ content: "https://keeper.sh/test", property: "og:url" });
  });
});
