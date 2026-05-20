import { describe, it, expect, vi } from "vitest";

vi.mock("@/utils/middleware", () => ({
  withWideEvent: (handler: any) => handler,
}));

vi.mock("@/env", () => ({
  default: {},
}));

vi.mock("@/utils/ical", () => ({
  generateUserCalendar: vi.fn(),
}));

import { GET } from "@/routes/api/cal/[identifier]";
import * as ical from "@/utils/ical";

describe("public cal route", () => {
  it("returns 404 if identifier doesn't end with .ics", async () => {
    const response = await GET({ params: { identifier: "invalid" } } as any);
    expect(response.status).toBe(404);
  });

  it("returns calendar if identifier is valid", async () => {
    (ical.generateUserCalendar as any).mockResolvedValue("BEGIN:VCALENDAR...");
    const response = await GET({ params: { identifier: "user1.ics" } } as any);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("BEGIN:VCALENDAR...");
    expect(response.headers.get("Content-Type")).toContain("text/calendar");
  });

  it("returns 404 if calendar generation returns null", async () => {
    (ical.generateUserCalendar as any).mockResolvedValue(null);
    const response = await GET({ params: { identifier: "nonexistent.ics" } } as any);

    expect(response.status).toBe(404);
  });
});
