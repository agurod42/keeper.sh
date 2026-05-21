import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetcher, apiFetch, HttpError } from "../../src/lib/fetcher";

describe("fetcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn();
  });

  it("fetcher returns json on success", async () => {
    const mockData = { foo: "bar" };
    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    const result = await fetcher("/api/test");
    expect(result).toEqual(mockData);
    expect(globalThis.fetch).toHaveBeenCalledWith("/api/test", expect.anything());
  });

  it("fetcher throws HttpError on failure", async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: false,
      status: 404,
    });

    await expect(fetcher("/api/test")).rejects.toThrow(HttpError);
  });

  it("apiFetch returns response on success", async () => {
    const mockResponse = { ok: true };
    (globalThis.fetch as any).mockResolvedValue(mockResponse);

    const result = await apiFetch("/api/test", { method: "POST" });
    expect(result).toBe(mockResponse);
  });
});
