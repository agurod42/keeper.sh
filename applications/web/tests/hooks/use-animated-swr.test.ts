import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAnimatedSWR } from "../../src/hooks/use-animated-swr";

vi.mock("swr", () => ({
  default: vi.fn(() => ({ data: undefined, isLoading: true })),
}));

describe("useAnimatedSWR", () => {
  it("returns shouldAnimate true when loading initially", () => {
    const { result } = renderHook(() => useAnimatedSWR("/api/test"));
    expect(result.current.shouldAnimate).toBe(true);
  });
});
