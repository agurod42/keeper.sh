import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Heading2 } from "@/components/ui/primitives/heading";
import { Text } from "@/components/ui/primitives/text";

type CancelStatus = "pending" | "done" | "error";

export const Route = createFileRoute("/(booking)/book/cancel/$token")({
  component: CancelBooking,
});

function CancelBooking() {
  const { token } = Route.useParams();
  const [status, setStatus] = useState<CancelStatus>("pending");

  useEffect(() => {
    let active = true;
    fetch(`/api/book/cancel/${token}`, { method: "POST", credentials: "include" })
      .then((response) => {
        if (active) {
          setStatus(response.ok ? "done" : "error");
        }
      })
      .catch(() => {
        if (active) {
          setStatus("error");
        }
      });
    return () => {
      active = false;
    };
  }, [token]);

  if (status === "pending") {
    return <Text tone="muted">Cancelling…</Text>;
  }
  if (status === "error") {
    return (
      <div className="flex flex-col gap-2">
        <Heading2>We couldn't cancel that booking</Heading2>
        <Text size="sm" tone="muted">The link may be invalid or the booking was already cancelled.</Text>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <Heading2>Booking cancelled</Heading2>
      <Text size="sm" tone="muted">Both you and the host have been notified.</Text>
    </div>
  );
}
