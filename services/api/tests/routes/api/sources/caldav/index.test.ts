import { describe, it, expect, vi } from "vitest";

vi.mock("@/utils/middleware", () => ({
  withAuth: (handler: any) => handler,
  withWideEvent: (handler: any) => handler,
}));

vi.mock("@/utils/caldav-sources", () => ({
  getUserCalDAVSources: vi.fn(),
  createCalDAVSource: vi.fn(),
  CalDAVSourceLimitError: class extends Error {},
  DuplicateCalDAVSourceError: class extends Error {},
}));

import { GET, POST } from "@/routes/api/sources/caldav/index";
import * as caldavSources from "@/utils/caldav-sources";

describe("caldav sources route", () => {
  describe("GET", () => {
    it("returns user caldav sources", async () => {
      (caldavSources.getUserCalDAVSources as any).mockResolvedValue([{ id: "source-1" }]);
      const request = new Request("http://localhost:3000/api/sources/caldav");
      const response = await GET({ request, userId: "user-1", params: {} } as any);

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual([{ id: "source-1" }]);
    });
  });

  describe("POST", () => {
    it("creates a new caldav source", async () => {
      const mockSource = { id: "source-1" };
      (caldavSources.createCalDAVSource as any).mockResolvedValue(mockSource);
      
      const body = {
        name: "My Cal",
        provider: "caldav",
        authMethod: "basic",
        serverUrl: "https://dav.com",
        calendarUrl: "https://dav.com/cal",
        username: "user",
        password: "pass",
      };
      const request = new Request("http://localhost:3000/api/sources/caldav", {
        method: "POST",
        body: JSON.stringify(body),
      });
      
      const response = await POST({ request, userId: "user-1", params: {} } as any);

      expect(response.status).toBe(201);
      expect(await response.json()).toEqual(mockSource);
    });
  });
});
