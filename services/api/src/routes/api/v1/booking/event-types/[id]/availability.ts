import { withV1Auth, withWideEvent } from "@/utils/middleware";
import { ErrorResponse } from "@/utils/responses";
import { getEventType, replaceAvailabilityRules } from "@/queries/booking-admin";
import { getAvailabilityRules } from "@/queries/booking";
import { availabilityPutBodySchema } from "@/utils/request-body";
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

    const rules = await getAvailabilityRules(database, id);
    return Response.json({ rules });
  }),
);

const PUT = withWideEvent(
  withV1Auth(async ({ request, params, userId }) => {
    const { id } = params;
    if (!id) {
      return ErrorResponse.badRequest("Event type id is required.").toResponse();
    }

    const eventType = await getEventType(database, userId, id);
    if (!eventType) {
      return ErrorResponse.notFound("Event type not found.").toResponse();
    }

    const payload = await request.json();
    if (!availabilityPutBodySchema.allows(payload)) {
      return ErrorResponse.badRequest("Invalid availability rules.").toResponse();
    }

    const invalid = payload.rules.some((rule) => rule.endMinute <= rule.startMinute);
    if (invalid) {
      return ErrorResponse.badRequest("Each rule must end after it starts.").toResponse();
    }

    await replaceAvailabilityRules(database, id, payload.rules);
    return Response.json({ rules: payload.rules });
  }),
);

export { GET, PUT };
