import { HTTP_STATUS } from "@keeper.sh/constants";
import { withV1Auth, withWideEvent } from "@/utils/middleware";
import { ErrorResponse } from "@/utils/responses";
import { createEventType, listEventTypes, userOwnsCalendar } from "@/queries/booking-admin";
import { eventTypeCreateBodySchema } from "@/utils/request-body";
import { database } from "@/context";

const GET = withWideEvent(
  withV1Auth(async ({ userId }) => {
    const eventTypes = await listEventTypes(database, userId);
    return Response.json({ eventTypes });
  }),
);

const POST = withWideEvent(
  withV1Auth(async ({ request, userId }) => {
    const payload = await request.json();
    if (!eventTypeCreateBodySchema.allows(payload)) {
      return ErrorResponse.badRequest("Invalid event type.").toResponse();
    }
    const body = payload;

    const calendarIds = [body.destinationCalendarId, ...(body.conflictCalendarIds ?? [])];
    const ownership = await Promise.all(
      calendarIds.map((calendarId) => userOwnsCalendar(database, userId, calendarId)),
    );
    if (ownership.includes(false)) {
      return ErrorResponse.badRequest("Calendar does not belong to the user.").toResponse();
    }

    const created = await createEventType(database, userId, body);
    if (!created) {
      return ErrorResponse.conflict("An event type with this slug already exists.").toResponse();
    }

    return Response.json(created, { status: HTTP_STATUS.CREATED });
  }),
);

export { GET, POST };
