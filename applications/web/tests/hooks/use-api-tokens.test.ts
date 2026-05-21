import { describe, it, expect, vi, beforeEach } from "vitest";
import { createApiToken, deleteApiToken } from "../../src/hooks/use-api-tokens";

vi.mock("@/lib/fetcher", () => ({
  apiFetch: vi.fn(),
}));

describe("use-api-tokens hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createApiToken calls API", async () => {
    const { apiFetch } = await import("@/lib/fetcher");
    (apiFetch as any).mockResolvedValue({
      json: async () => ({ id: "t1" }),
    });

    const result = await createApiToken("New Token");
    expect(result).toEqual({ id: "t1" });
    expect(apiFetch).toHaveBeenCalledWith("/api/tokens", expect.objectContaining({ method: "POST" }));
  });

  it("deleteApiToken calls API", async () => {
    const { apiFetch } = await import("@/lib/fetcher");
    (apiFetch as any).mockResolvedValue({});

    await deleteApiToken("t1");
    expect(apiFetch).toHaveBeenCalledWith("/api/tokens/t1", expect.objectContaining({ method: "DELETE" }));
  });
});
