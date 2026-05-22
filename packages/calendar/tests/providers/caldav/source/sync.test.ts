import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCalDAVSourceService } from "../../../../src/providers/caldav/source/sync";

vi.mock("@keeper.sh/database", () => ({
  decryptPassword: vi.fn(() => "decrypted"),
}));

describe("CalDAVSourceService", () => {
  const mockDb = {
    select: vi.fn(() => ({
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([
        {
          calendarId: "c1",
          calendarUrl: "url1",
          encryptedPassword: "enc",
          username: "u",
          serverUrl: "s",
          provider: "p",
        },
      ]),
    })),
  };

  const config = { database: mockDb as any, encryptionKey: "key" };

  it("getAllCalDAVSources maps results correctly", async () => {
    const service = createCalDAVSourceService(config);
    const result = await service.getAllCalDAVSources();
    expect(result).toHaveLength(1);
    expect(result[0].calendarUrl).toBe("url1");
  });

  it("getDecryptedPassword calls database utility", () => {
    const service = createCalDAVSourceService(config);
    const pass = service.getDecryptedPassword("enc");
    expect(pass).toBe("decrypted");
  });
});
