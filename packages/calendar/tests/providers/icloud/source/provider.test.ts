import { describe, it, expect, vi } from "vitest";
import { createICloudSourceProvider } from "../../../../src/providers/icloud/source/provider";
import * as caldav from "../../../../src/providers/caldav";

vi.mock("../../../../src/providers/caldav", () => ({
  createCalDAVSourceProvider: vi.fn(),
}));

describe("createICloudSourceProvider", () => {
  it("calls createCalDAVSourceProvider with icloud options", () => {
    const config = { database: {} as any, encryptionKey: "key" };
    createICloudSourceProvider(config);
    expect(caldav.createCalDAVSourceProvider).toHaveBeenCalledWith(
      config,
      expect.objectContaining({ providerId: "icloud" })
    );
  });
});
