import { describe, it, expect, vi } from "vitest";
import { ensureValidToken } from "../../../src/core/oauth/ensure-valid-token";

describe("ensureValidToken", () => {
  it("does nothing if token is still valid", async () => {
    const tokenState = {
      accessToken: "at",
      accessTokenExpiresAt: new Date(Date.now() + 1000000),
      refreshToken: "rt",
    };
    const refresh = vi.fn();

    await ensureValidToken(tokenState, refresh);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("refreshes token if expired", async () => {
    const tokenState = {
      accessToken: "old-at",
      accessTokenExpiresAt: new Date(Date.now() - 1000),
      refreshToken: "rt",
    };
    const refresh = vi.fn().mockResolvedValue({
      access_token: "new-at",
      expires_in: 3600,
    });

    await ensureValidToken(tokenState, refresh);
    expect(refresh).toHaveBeenCalledWith("rt");
    expect(tokenState.accessToken).toBe("new-at");
  });

  it("updates refresh_token if returned", async () => {
    const tokenState = {
      accessToken: "old-at",
      accessTokenExpiresAt: new Date(0),
      refreshToken: "old-rt",
    };
    const refresh = vi.fn().mockResolvedValue({
      access_token: "new-at",
      refresh_token: "new-rt",
      expires_in: 3600,
    });

    await ensureValidToken(tokenState, refresh);
    expect(tokenState.refreshToken).toBe("new-rt");
  });
});
