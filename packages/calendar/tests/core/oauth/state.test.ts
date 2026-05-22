import { describe, it, expect, vi } from "vitest";
import { generateState, validateState } from "../../../src/core/oauth/state";

describe("oauth state", () => {
  const mockStore = {
    set: vi.fn().mockResolvedValue(undefined),
    consume: vi.fn(),
  };

  it("generates state and stores it", async () => {
    const state = await generateState(mockStore, "u1", { region: "us" });
    expect(state).toBeDefined();
    expect(mockStore.set).toHaveBeenCalledWith(
      expect.stringContaining("oauth:state:"),
      expect.stringContaining('"userId":"u1"'),
      expect.any(Number)
    );
  });

  it("validates valid state", async () => {
    const pendingState = {
      userId: "u1",
      destinationId: null,
      sourceCredentialId: null,
      region: "us",
      expiresAt: Date.now() + 10000,
    };
    mockStore.consume.mockResolvedValue(JSON.stringify(pendingState));

    const result = await validateState(mockStore, "some-state");
    expect(result?.userId).toBe("u1");
  });

  it("handles state without optional fields", async () => {
    const pendingState = {
      userId: "u1",
      expiresAt: Date.now() + 10000,
    };
    mockStore.consume.mockResolvedValue(JSON.stringify(pendingState));

    const result = await validateState(mockStore, "some-state");
    expect(result?.region).toBeNull();
  });

  it("returns null for expired state", async () => {
    const pendingState = {
      userId: "u1",
      expiresAt: Date.now() - 10000,
    };
    mockStore.consume.mockResolvedValue(JSON.stringify(pendingState));

    const result = await validateState(mockStore, "some-state");
    expect(result).toBeNull();
  });
});
