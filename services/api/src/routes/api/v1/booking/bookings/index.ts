import { withV1Auth, withWideEvent } from "@/utils/middleware";
import { listHostBookings } from "@/queries/booking-admin";
import { database } from "@/context";

const GET = withWideEvent(
  withV1Auth(async ({ userId }) => {
    const bookings = await listHostBookings(database, userId);
    return Response.json({ bookings });
  }),
);

export { GET };
