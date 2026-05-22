import { describe, it, expect, vi, beforeEach } from "vitest";
import { createDigestAwareFetch } from "../../../../src/providers/caldav/shared/digest-fetch";

vi.mock("@keeper.sh/digest-fetch", () => ({
  createDigestClient: vi.fn(() => ({
    fetch: vi.fn().mockResolvedValue({ ok: true, status: 200 }),
  })),
}));

describe("createDigestAwareFetch", () => {
  const credentials = { username: "user", password: "pass" };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses basic auth by default", async () => {
    const baseFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    const { fetch: digestFetch } = createDigestAwareFetch({ credentials, baseFetch });
    
    await digestFetch("https://dav.com");
    expect(baseFetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        headers: expect.objectContaining({ authorization: expect.stringContaining("Basic") })
      })
    );
  });

  it("switches to digest on 401 challenge", async () => {
    const baseFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: new Headers({ "www-authenticate": 'Digest realm="test"' }),
    });
    
    const { fetch: digestFetch, getResolvedMethod } = createDigestAwareFetch({ credentials, baseFetch });
    
    await digestFetch("https://dav.com");
    expect(getResolvedMethod()).toBe("digest");
  });
});
