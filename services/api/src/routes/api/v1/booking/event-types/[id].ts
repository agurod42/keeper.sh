import { withV1Auth, withWideEvent } from "@/utils/middleware";
import { ErrorResponse } from "@/utils/responses";
import {
  deleteEventType,
  getEventType,
  updateEventType,
  userOwnsCalendar,
} from "@/queries/booking-admin";
import { eventTypePatchBodySchema } from "@/utils/request-body";
import { database } from "@/context";

const GET = withWideEvent(
  withV1Auth(async ({ params, userId }) => {
    const { id } = params;
    if (!id) {
      return ErrorResponse.badRequest("Event type id is required.").toResponse();
    }

    const eventType = await getEventType(database, userId, id);
    if (!eventType) {
      return ErrorResponse.notFound("Event type not found.").toResponse();
    }

    return Response.json(eventType);
  }),
);

const PATCH = withWideEvent(
  withV1Auth(async ({ request, params, userId }) => {
    const { id } = params;
    if (!id) {
      return ErrorResponse.badRequest("Event type id is required.").toResponse();
    }

    const payload = await request.json();
    if (!eventTypePatchBodySchema.allows(payload)) {
      return ErrorResponse.badRequest("Invalid event type update.").toResponse();
    }
    const patch = payload;

    const calendarIds: string[] = [];
    if (patch.destinationCalendarId) {
      calendarIds.push(patch.destinationCalendarId);
    }
    if (patch.conflictCalendarIds) {
      calendarIds.push(...patch.conflictCalendarIds);
    }
    const ownership = await Promise.all(
      calendarIds.map((calendarId) => userOwnsCalendar(database, userId, calendarId)),
    );
    if (ownership.includes(false)) {
      return ErrorResponse.badRequest("Calendar does not belong to the user.").toResponse();
    }

    const updated = await updateEventType(database, userId, id, patch);
    if (!updated) {
      return ErrorResponse.notFound("Event type not found.").toResponse();
    }

    return Response.json(updated);
  }),
);

const DELETE = withWideEvent(
  withV1Auth(async ({ params, userId }) => {
    const { id } = params;
    if (!id) {
      return ErrorResponse.badRequest("Event type id is required.").toResponse();
    }

    const removed = await deleteEventType(database, userId, id);
    if (!removed) {
      return ErrorResponse.notFound("Event type not found.").toResponse();
    }

    return Response.json({ deleted: true });
  }),
);

export { DELETE, GET, PATCH };
