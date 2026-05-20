import { describe, it, expect, vi } from "vitest";

vi.mock("widelogger", () => ({
  widelogger: vi.fn(() => ({
    context: vi.fn(),
    destroy: vi.fn(),
  })),
  widelog: {},
}));

import { context, destroy, widelog } from "../../src/utils/logging";

describe("logging", () => {
  it("exports context, destroy and widelog", () => {
    expect(context).toBeDefined();
    expect(destroy).toBeDefined();
    expect(widelog).toBeDefined();
  });
});
