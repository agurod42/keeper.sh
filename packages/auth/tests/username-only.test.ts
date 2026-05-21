import { describe, it, expect, vi } from "vitest";
import { createSignInEndpoint } from "../src/plugins/username-only/endpoints/sign-in";
import { createSignUpEndpoint } from "../src/plugins/username-only/endpoints/sign-up";

const mockContext = {
  body: { username: "user1", password: "pass1" },
  context: {
    adapter: {
      findOne: vi.fn(),
      create: vi.fn(),
    },
    password: {
      verify: vi.fn(),
      hash: vi.fn(),
    },
    internalAdapter: {
      createSession: vi.fn(),
    },
    authCookies: {
      sessionToken: { name: "session", attributes: {} },
    },
    secret: "secret",
  },
  setSignedCookie: vi.fn(),
  json: vi.fn((data) => data),
};

vi.mock("better-auth/api", () => ({
  createAuthEndpoint: vi.fn((path, config, handler) => ({ handler, path, config })),
}));

describe("username-only endpoints", () => {
  describe("sign-in", () => {
    it("authenticates valid user", async () => {
      const endpoint = createSignInEndpoint() as any;
      const user = { id: "u1", username: "user1" };
      const account = { password: "hashed-password" };
      
      mockContext.context.adapter.findOne
        .mockResolvedValueOnce(user)
        .mockResolvedValueOnce(account);
      mockContext.context.password.verify.mockResolvedValue(true);
      mockContext.context.internalAdapter.createSession.mockResolvedValue({ token: "session-token" });

      const result = await endpoint.handler(mockContext);

      expect(result.user).toEqual(user);
      expect(mockContext.setSignedCookie).toHaveBeenCalled();
    });
  });

  describe("sign-up", () => {
    const mockConfig = {
      minPasswordLength: 1,
      maxPasswordLength: 100,
      minUsernameLength: 1,
      maxUsernameLength: 100,
    };

    it("creates user successfully", async () => {
      const endpoint = createSignUpEndpoint(mockConfig) as any;
      const user = { id: "u1", username: "user1" };
      
      mockContext.context.adapter.findOne.mockResolvedValue(null);
      mockContext.context.password.hash.mockResolvedValue("hashed");
      mockContext.context.adapter.create.mockResolvedValue(user);
      mockContext.context.internalAdapter.createSession.mockResolvedValue({ token: "session-token" });

      const result = await endpoint.handler(mockContext);

      expect(result.user).toEqual(user);
      expect(mockContext.context.adapter.create).toHaveBeenCalledTimes(2);
    });
  });
});
