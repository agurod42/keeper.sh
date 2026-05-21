import { describe, it, expect, vi, afterEach } from "vitest";
import { getRuntimeEnvironment, isTestEnvironment, writeAuthStderr } from "../src/runtime-environment";

describe("runtime-environment", () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  it("identifies test environment", () => {
    process.env = { ...originalEnv, ENV: "test" };
    expect(isTestEnvironment()).toBe(true);
  });

  it("identifies other environments", () => {
    process.env = { ...originalEnv, ENV: "production" };
    expect(isTestEnvironment()).toBe(false);
    expect(getRuntimeEnvironment()).toBe("production");
  });

  it("writeAuthStderr does nothing in test environment", () => {
    const stderrSpy = vi.spyOn(process.stderr, "write");
    process.env = { ...originalEnv, ENV: "test" };
    writeAuthStderr("message");
    expect(stderrSpy).not.toHaveBeenCalled();
    stderrSpy.mockRestore();
  });
});
