import { describe, it, expect } from "vitest";
import { pluralize } from "../../src/lib/pluralize";

describe("pluralize", () => {
  it("pluralizes singular correctly", () => {
    expect(pluralize(1, "event")).toBe("1 event");
  });

  it("pluralizes multiple correctly", () => {
    expect(pluralize(2, "event")).toBe("2 events");
    expect(pluralize(1000, "event")).toBe("1,000 events");
  });

  it("uses custom plural correctly", () => {
    expect(pluralize(2, "category", "categories")).toBe("2 categories");
  });
});
