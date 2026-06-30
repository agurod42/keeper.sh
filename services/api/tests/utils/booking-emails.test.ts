import { describe, it, expect, vi } from "vitest";
import {
  sendBookingCancellation,
  sendBookingConfirmation,
} from "../../src/utils/booking-emails";
import type { BookingEmailData } from "../../src/utils/booking-emails";

const data: BookingEmailData = {
  eventTitle: "Intro call",
  hostName: "Host Person",
  hostEmail: "host@example.org",
  guestName: "Test User",
  guestEmail: "guest@example.org",
  guestTimezone: "Asia/Tokyo",
  hostTimezone: "America/Montevideo",
  startTime: new Date("2025-01-06T12:00:00.000Z"),
  endTime: new Date("2025-01-06T12:30:00.000Z"),
  location: "https://example.org/call",
  cancelUrl: "https://book.example.org/book/cancel/tok-1",
  userEventId: "ue-1",
};

const decodeIcs = (sendArgs: { attachments?: { content: string }[] }): string =>
  Buffer.from(sendArgs.attachments?.[0]?.content ?? "", "base64").toString("utf8");

describe("booking emails", () => {
  it("is a no-op when Resend is not configured", async () => {
    await expect(
      sendBookingConfirmation({ resend: null, fromEmail: null }, data),
    ).resolves.toBeUndefined();
  });

  it("emails both parties with a REQUEST invite on confirmation", async () => {
    const send = vi.fn().mockResolvedValue({});
    const resend = { emails: { send } } as never;

    await sendBookingConfirmation({ resend, fromEmail: "noreply@example.org" }, data);

    expect(send).toHaveBeenCalledTimes(2);
    const recipients = send.mock.calls.map(([args]) => args.to);
    expect(recipients).toEqual(["guest@example.org", "host@example.org"]);

    const ics = decodeIcs(send.mock.calls.at(0)?.at(0) ?? {});
    expect(ics).toContain("METHOD:REQUEST");
    expect(ics).toContain("UID:ue-1@keeper.sh");
    expect(ics).toContain("ORGANIZER");
    expect(ics).toContain("host@example.org");
    expect(ics).toContain("guest@example.org");
    expect(ics).toContain("STATUS:CONFIRMED");
  });

  it("emails both parties with a CANCEL update on cancellation", async () => {
    const send = vi.fn().mockResolvedValue({});
    const resend = { emails: { send } } as never;

    await sendBookingCancellation({ resend, fromEmail: "noreply@example.org" }, data);

    expect(send).toHaveBeenCalledTimes(2);
    const ics = decodeIcs(send.mock.calls.at(0)?.at(0) ?? {});
    expect(ics).toContain("METHOD:CANCEL");
    expect(ics).toContain("STATUS:CANCELLED");
    expect(ics).toContain("SEQUENCE:1");
  });
});
