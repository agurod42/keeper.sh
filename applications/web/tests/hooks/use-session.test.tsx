import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useSession } from "../../src/hooks/use-session";
import { SWRConfig } from "swr";
import React from "react";

const { mockAuthClient } = vi.hoisted(() => ({
  mockAuthClient: {
    getSession: vi.fn(),
  },
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: mockAuthClient,
}));

describe("useSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <SWRConfig value={{ provider: () => new Map() }}>
      {children}
    </SWRConfig>
  );

  it("returns user data when session is active", async () => {
    mockAuthClient.getSession.mockResolvedValue({
      data: {
        user: { id: "u1", email: "test@example.com" },
      },
    });

    const { result } = renderHook(() => useSession(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.user).toEqual({ id: "u1", email: "test@example.com", name: undefined, username: undefined });
    });
  });

  it("returns null when no session", async () => {
    mockAuthClient.getSession.mockResolvedValue({ data: null });
    const { result } = renderHook(() => useSession(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.user).toBeNull();
    });
  });
});
