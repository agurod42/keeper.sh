import { KEEPER_EVENT_SUFFIX } from "@keeper.sh/constants";
import { generateIcsCalendar } from "ts-ics";
import type { IcsCalendar, IcsEvent } from "ts-ics";
import type { Resend } from "resend";

type IcsMethod = "REQUEST" | "CANCEL";

const ICS_FILENAME = "invite.ics";
const STATUS_BY_METHOD = { REQUEST: "CONFIRMED", CANCEL: "CANCELLED" } as const;
const SEQUENCE_BY_METHOD = { REQUEST: 0, CANCEL: 1 } as const;

interface BookingEmailContext {
  resend: Resend | null;
  fromEmail: string | null;
}

interface BookingEmailData {
  eventTitle: string;
  hostName: string;
  hostEmail: string;
  guestName: string;
  guestEmail: string;
  guestTimezone: string;
  hostTimezone: string;
  startTime: Date;
  endTime: Date;
  location: string | null;
  cancelUrl: string;
  userEventId: string;
}

const formatInstant = (instant: Date, timeZone: string): string =>
  new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(instant);

const buildIcs = (data: BookingEmailData, method: IcsMethod): string => {
  const event: IcsEvent = {
    uid: `${data.userEventId}${KEEPER_EVENT_SUFFIX}`,
    stamp: { date: new Date(data.startTime) },
    start: { date: data.startTime },
    end: { date: data.endTime },
    summary: data.eventTitle,
    organizer: { name: data.hostName, email: data.hostEmail },
    attendees: [{ email: data.guestEmail, name: data.guestName, rsvp: true }],
    status: STATUS_BY_METHOD[method],
    sequence: SEQUENCE_BY_METHOD[method],
  };
  if (data.location) {
    event.location = data.location;
  }

  const calendar: IcsCalendar = {
    version: "2.0",
    prodId: "-//Keeper//Booking//EN",
    method,
    events: [event],
  };

  return generateIcsCalendar(calendar);
};

const detailsHtml = (data: BookingEmailData, audienceTimeZone: string): string => {
  const rows = [
    `<strong>${data.eventTitle}</strong>`,
    `When: ${formatInstant(data.startTime, audienceTimeZone)}`,
  ];
  if (data.location) {
    rows.push(`Where: ${data.location}`);
  }
  return rows.map((row) => `<p>${row}</p>`).join("");
};

const send = async (
  context: BookingEmailContext,
  message: {
    to: string;
    subject: string;
    html: string;
    ics: { content: string; method: IcsMethod };
  },
): Promise<void> => {
  if (!context.resend || !context.fromEmail) {
    return;
  }

  await context.resend.emails.send({
    from: context.fromEmail,
    to: message.to,
    subject: message.subject,
    html: message.html,
    attachments: [
      {
        filename: ICS_FILENAME,
        content: Buffer.from(message.ics.content).toString("base64"),
        contentType: `text/calendar; charset=utf-8; method=${message.ics.method}`,
      },
    ],
  });
};

/** Confirmation to the guest (with calendar invite) and notification to the host. */
const sendBookingConfirmation = async (
  context: BookingEmailContext,
  data: BookingEmailData,
): Promise<void> => {
  const ics = buildIcs(data, "REQUEST");

  await Promise.all([
    send(context, {
      to: data.guestEmail,
      subject: `Confirmed: ${data.eventTitle}`,
      html: `${detailsHtml(data, data.guestTimezone)}<p>To cancel, visit <a href="${data.cancelUrl}">${data.cancelUrl}</a>.</p>`,
      ics: { content: ics, method: "REQUEST" },
    }),
    send(context, {
      to: data.hostEmail,
      subject: `New booking: ${data.eventTitle} — ${data.guestName}`,
      html: `${detailsHtml(data, data.hostTimezone)}<p>Guest: ${data.guestName} (${data.guestEmail})</p>`,
      ics: { content: ics, method: "REQUEST" },
    }),
  ]);
};

/** Cancellation notice to both parties, with a cancelling calendar update. */
const sendBookingCancellation = async (
  context: BookingEmailContext,
  data: BookingEmailData,
): Promise<void> => {
  const ics = buildIcs(data, "CANCEL");

  await Promise.all([
    send(context, {
      to: data.guestEmail,
      subject: `Cancelled: ${data.eventTitle}`,
      html: `<p>Your booking has been cancelled.</p>${detailsHtml(data, data.guestTimezone)}`,
      ics: { content: ics, method: "CANCEL" },
    }),
    send(context, {
      to: data.hostEmail,
      subject: `Cancelled: ${data.eventTitle} — ${data.guestName}`,
      html: `<p>A booking has been cancelled.</p>${detailsHtml(data, data.hostTimezone)}<p>Guest: ${data.guestName} (${data.guestEmail})</p>`,
      ics: { content: ics, method: "CANCEL" },
    }),
  ]);
};

export { sendBookingCancellation, sendBookingConfirmation };
export type { BookingEmailContext, BookingEmailData };
