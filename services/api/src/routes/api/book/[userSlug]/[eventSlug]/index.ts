import { HTTP_STATUS } from "@keeper.sh/constants";
import { withWideEvent } from "@/utils/middleware";
import { widelog } from "@/utils/logging";
import { ErrorResponse } from "@/utils/responses";
import { createKeeperApi } from "@/read-models";
import { getHostContact, resolveBookingTarget } from "@/queries/booking";
import { createBooking } from "@/utils/booking-create";
import { sendBookingConfirmation } from "@/utils/booking-emails";
import { bookingCreateBodySchema } from "@/utils/request-body";
import {
  bookingFromEmail,
  bookingPublicUrl,
  database,
  encryptionKey,
  oauthProviders,
  refreshLockStore,
  resend,
} from "@/context";

const keeperApi = createKeeperApi(database, {
  oauthTokenRefresher: oauthProviders,
  refreshLockStore,
  encryptionKey,
});

const cancelUrlFor = (token: string): string =>
  new URL(`/book/cancel/${token}`, bookingPublicUrl).toString();

/**
 * Public booking page metadata. Resolves `{userSlug}/{eventSlug}` to the host
 * profile and active event type, exposing only display-safe fields — never the
 * destination/conflict calendar ids or the owning userId.
 */
const GET = withWideEvent(async ({ params }) => {
  const { userSlug, eventSlug } = params;
  if (!userSlug || !eventSlug) {
    return ErrorResponse.notFound().toResponse();
  }

  const target = await resolveBookingTarget(database, userSlug, eventSlug);
  if (!target) {
    return ErrorResponse.notFound().toResponse();
  }

  const { eventType, profile } = target;
  return Response.json({
    profile,
    eventType: {
      slug: eventType.slug,
      title: eventType.title,
      description: eventType.description,
      durationMinutes: eventType.durationMinutes,
      locationType: eventType.locationType,
      color: eventType.color,
      timezone: eventType.timezone,
    },
  });
});

/**
 * Create a booking. The slot is re-validated server-side; the calendar event is
 * written through the unified API (sync fans it out to all calendars) and the
 * confirmed-slot row is the double-booking backstop (409 on conflict).
 */
const POST = withWideEvent(async ({ request, params }) => {
  const { userSlug, eventSlug } = params;
  if (!userSlug || !eventSlug) {
    return ErrorResponse.notFound().toResponse();
  }

  const payload = await request.json();
  if (!bookingCreateBodySchema.allows(payload)) {
    return ErrorResponse.badRequest("Invalid booking request.").toResponse();
  }
  const body = payload;

  const target = await resolveBookingTarget(database, userSlug, eventSlug);
  if (!target) {
    return ErrorResponse.notFound().toResponse();
  }

  const result = await createBooking({ database, keeperApi }, target, body);

  if (result.status === "invalid") {
    return ErrorResponse.badRequest(result.message).toResponse();
  }
  if (result.status === "unavailable") {
    return ErrorResponse.conflict("This slot is no longer available.").toResponse();
  }

  const { booking } = result;
  const cancelUrl = cancelUrlFor(booking.cancelToken);

  const host = await getHostContact(database, target.eventType.userId);
  if (host) {
    try {
      await sendBookingConfirmation(
        { resend, fromEmail: bookingFromEmail },
        {
          eventTitle: target.eventType.title,
          hostName: target.profile.displayName || host.name,
          hostEmail: host.email,
          hostTimezone: target.eventType.timezone,
          guestName: booking.guestName,
          guestEmail: booking.guestEmail,
          guestTimezone: booking.guestTimezone,
          startTime: booking.startTime,
          endTime: booking.endTime,
          location: target.eventType.locationValue,
          cancelUrl,
          userEventId: booking.userEventId,
        },
      );
    } catch (error) {
      widelog.errorFields(error, { slug: "booking_confirmation_email" });
    }
  }

  return Response.json(
    {
      id: booking.id,
      startTime: booking.startTime.toISOString(),
      endTime: booking.endTime.toISOString(),
      eventType: { title: target.eventType.title, timezone: target.eventType.timezone },
      guestName: booking.guestName,
      guestEmail: booking.guestEmail,
      guestTimezone: booking.guestTimezone,
      cancelUrl,
    },
    { status: HTTP_STATUS.CREATED },
  );
});

export { GET, POST };
