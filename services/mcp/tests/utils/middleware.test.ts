import { describe, it, expect, vi, beforeEach } from "vitest";
import { withWideEvent } from "../../src/utils/middleware";

vi.mock("../../src/utils/logging", () => ({
  context: vi.fn((cb) => cb()),
  widelog: {
    set: vi.fn(),
    time: {
      measure: vi.fn((_, cb) => cb()),
    },
    errorFields: vi.fn(),
    flush: vi.fn(),
  },
}));

describe("mcp middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("withWideEvent logs request details and outcome", async () => {
    const handler = vi.fn(() => new Response("ok", { status: 200 }));
    const wrapped = withWideEvent(handler);
    
    const request = new Request("http://localhost/health");
    const response = await wrapped(request);

    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalled();
  });
});
