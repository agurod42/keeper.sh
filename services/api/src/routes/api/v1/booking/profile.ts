import { withV1Auth, withWideEvent } from "@/utils/middleware";
import { ErrorResponse } from "@/utils/responses";
import { getBookingProfile, upsertBookingProfile } from "@/queries/booking-admin";
import { bookingProfilePutBodySchema } from "@/utils/request-body";
import { database } from "@/context";

const GET = withWideEvent(
  withV1Auth(async ({ userId }) => {
    const profile = await getBookingProfile(database, userId);
    return Response.json({ profile });
  }),
);

const PUT = withWideEvent(
  withV1Auth(async ({ request, userId }) => {
    const payload = await request.json();
    if (!bookingProfilePutBodySchema.allows(payload)) {
      return ErrorResponse.badRequest("Invalid profile.").toResponse();
    }

    const profile = await upsertBookingProfile(database, userId, payload);
    if (!profile) {
      return ErrorResponse.conflict("This slug is already taken.").toResponse();
    }

    return Response.json({ profile });
  }),
);

export { GET, PUT };
