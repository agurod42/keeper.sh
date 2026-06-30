import { withWideEvent } from "@/utils/middleware";
import { ErrorResponse } from "@/utils/responses";
import { resolveBookingTarget } from "@/queries/booking";
import { database } from "@/context";

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

export { GET };
