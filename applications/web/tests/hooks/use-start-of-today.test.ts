import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useStartOfToday } from "../../src/hooks/use-start-of-today";

describe("useStartOfToday", () => {
  it("returns start of today", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-20T10:00:00Z"));
    
    const { result } = renderHook(() => useStartOfToday());
    
    expect(result.current.getUTCFullYear()).toBe(2026);
    expect(result.current.getUTCMonth()).toBe(4); // May
    expect(result.current.getUTCDate()).toBe(20);
    expect(result.current.getHours()).toBe(0);

    vi.useRealTimers();
  });
});
