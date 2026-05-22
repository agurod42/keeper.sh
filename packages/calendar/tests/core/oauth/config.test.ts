import { describe, it, expect } from "vitest";
import { buildOAuthConfigs } from "../../../src/core/oauth/config";

describe("oauth config", () => {
  it("builds configs from env", () => {
    const env = {
      GOOGLE_CLIENT_ID: "g1",
      GOOGLE_CLIENT_SECRET: "gs1",
    };
    const configs = buildOAuthConfigs(env);
    expect(configs.google).toEqual({ clientId: "g1", clientSecret: "gs1" });
    expect(configs.microsoft).toBeNull();
  });
});
