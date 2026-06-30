import { bookingsTable } from "@keeper.sh/database/schema";
import { eq } from "drizzle-orm";
import { withWideEvent } from "@/utils/middleware";
import { widelog } from "@/utils/logging";
import { ErrorResponse } from "@/utils/responses";
import { createKeeperApi } from "@/read-models";
import { CONFIRMED_STATUS, resolveBookingByCancelToken } from "@/queries/booking";
import { sendBookingCancellation } from "@/utils/booking-emails";
import {
  bookingFromEmail,
  database,
  encryptionKey,
  oauthProviders,
  refreshLockStore,
  resend,
} from "@/context";

const CANCELLED_STATUS = "cancelled";

const keeperApi = createKeeperApi(database, {
  oauthTokenRefresher: oauthProviders,
  refreshLockStore,
  encryptionKey,
});

/**
 * Public booking cancellation by unguessable token. Idempotent: an
 * already-cancelled booking returns 200 without re-deleting or re-emailing.
 * Removes the calendar event (sync propagates the deletion), flips the row to
 * cancelled — freeing the slot via the partial unique index — and notifies both
 * parties.
 */
const POST = withWideEvent(async ({ params }) => {
  const { token } = params;
  if (!token) {
    return ErrorResponse.notFound().toResponse();
  }

  const booking = await resolveBookingByCancelToken(database, token);
  if (!booking) {
    return ErrorResponse.notFound().toResponse();
  }

  if (booking.status !== CONFIRMED_STATUS) {
    return Response.json({ status: CANCELLED_STATUS });
  }

  await keeperApi.deleteEvent(booking.hostUserId, booking.userEventId);

  await database
    .update(bookingsTable)
    .set({ status: CANCELLED_STATUS })
    .where(eq(bookingsTable.id, booking.bookingId));

  try {
    await sendBookingCancellation(
      { resend, fromEmail: bookingFromEmail },
      {
        eventTitle: booking.eventTitle,
        hostName: booking.hostDisplayName || booking.hostName,
        hostEmail: booking.hostEmail,
        hostTimezone: booking.eventTimezone,
        guestName: booking.guestName,
        guestEmail: booking.guestEmail,
        guestTimezone: booking.guestTimezone,
        startTime: booking.startTime,
        endTime: booking.endTime,
        location: null,
        cancelUrl: "",
        userEventId: booking.userEventId,
      },
    );
  } catch (error) {
    widelog.errorFields(error, { slug: "booking_cancellation_email" });
  }

  return Response.json({ status: CANCELLED_STATUS });
});

export { POST };
