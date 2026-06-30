import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import useSWR from "swr";
import { fetcher, HttpError } from "@/lib/fetcher";
import { Heading2, Heading3 } from "@/components/ui/primitives/heading";
import { Text } from "@/components/ui/primitives/text";
import { Input } from "@/components/ui/primitives/input";
import { Button, ButtonText } from "@/components/ui/primitives/button";

const DAYS_TO_OFFER = 14;
const MS_PER_DAY = 86_400_000;
const HTTP_CONFLICT = 409;

interface EventTypeMeta {
  profile: { slug: string; displayName: string; avatarUrl: string | null };
  eventType: {
    slug: string;
    title: string;
    description: string | null;
    durationMinutes: number;
    locationType: string;
    color: string | null;
    timezone: string;
  };
}

interface SlotsResponse {
  slots: string[];
}

interface BookingConfirmation {
  startTime: string;
  cancelUrl: string;
  eventType: { title: string; timezone: string };
}

export const Route = createFileRoute("/(booking)/$userSlug/$eventSlug")({
  component: BookingPage,
});

const guestTimezone = (): string =>
  Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

const pad = (value: number): string => value.toString().padStart(2, "0");

/** Today's `YYYY-MM-DD` in the guest timezone. */
const todayInTimeZone = (timeZone: string): string => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const lookup = new Map(parts.map((part) => [part.type, part.value]));
  return `${lookup.get("year")}-${lookup.get("month")}-${lookup.get("day")}`;
};

/** The next `DAYS_TO_OFFER` calendar dates starting today, in the guest tz. */
const upcomingDates = (timeZone: string): string[] => {
  const [year, month, day] = todayInTimeZone(timeZone).split("-").map(Number);
  const anchor = Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1);
  return Array.from({ length: DAYS_TO_OFFER }, (_, index) => {
    const date = new Date(anchor + index * MS_PER_DAY);
    return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
  });
};

const formatDayLabel = (date: string, timeZone: string): string => {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1, 12)));
};

const formatSlotTime = (iso: string, timeZone: string): string =>
  new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));

function BookingPage() {
  const { userSlug, eventSlug } = Route.useParams();
  const tz = useMemo(guestTimezone, []);
  const dates = useMemo(() => upcomingDates(tz), [tz]);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestNotes, setGuestNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);

  const metaUrl = `/api/book/${userSlug}/${eventSlug}`;
  const { data: meta, error: metaError } = useSWR<EventTypeMeta>(metaUrl, fetcher);

  const slotsUrl = selectedDate
    ? `/api/book/${userSlug}/${eventSlug}/slots?date=${selectedDate}&tz=${encodeURIComponent(tz)}`
    : null;
  const { data: slotsData, isLoading: slotsLoading } = useSWR<SlotsResponse>(slotsUrl, fetcher);

  if (metaError instanceof HttpError && metaError.status === 404) {
    return <Heading2>This booking page doesn't exist.</Heading2>;
  }
  if (!meta) {
    return <Text tone="muted">Loading…</Text>;
  }

  if (confirmation) {
    return (
      <div className="flex flex-col gap-3">
        <Heading2>You're booked</Heading2>
        <Text>
          {confirmation.eventType.title} —{" "}
          {new Intl.DateTimeFormat("en-US", {
            timeZone: tz,
            dateStyle: "full",
            timeStyle: "short",
          }).format(new Date(confirmation.startTime))}
        </Text>
        <Text size="sm" tone="muted">
          A calendar invite is on its way to {guestEmail}. Need to cancel?{" "}
          <a className="underline" href={confirmation.cancelUrl}>
            Cancel this booking
          </a>
          .
        </Text>
      </div>
    );
  }

  const submit = async () => {
    if (!selectedSlot) {
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const response = await fetch(metaUrl, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotStart: selectedSlot,
          guestName,
          guestEmail,
          guestNotes: guestNotes || undefined,
          guestTimezone: tz,
        }),
      });
      if (response.status === HTTP_CONFLICT) {
        setFormError("That time was just taken. Please pick another slot.");
        setSelectedSlot(null);
        return;
      }
      if (!response.ok) {
        setFormError("Something went wrong. Please try again.");
        return;
      }
      setConfirmation((await response.json()) as BookingConfirmation);
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <Text size="sm" tone="muted">
          {meta.profile.displayName}
        </Text>
        <Heading2>{meta.eventType.title}</Heading2>
        <Text size="sm" tone="muted">
          {meta.eventType.durationMinutes} minutes · times shown in {tz}
        </Text>
        {meta.eventType.description ? <Text size="sm">{meta.eventType.description}</Text> : null}
      </header>

      <section className="flex flex-col gap-2">
        <Heading3>Pick a day</Heading3>
        <div className="flex flex-wrap gap-2">
          {dates.map((date) => (
            <Button
              key={date}
              size="compact"
              variant={date === selectedDate ? "highlight" : "border"}
              onClick={() => {
                setSelectedDate(date);
                setSelectedSlot(null);
              }}
            >
              <ButtonText>{formatDayLabel(date, tz)}</ButtonText>
            </Button>
          ))}
        </div>
      </section>

      {selectedDate ? (
        <section className="flex flex-col gap-2">
          <Heading3>Pick a time</Heading3>
          {slotsLoading ? <Text size="sm" tone="muted">Loading times…</Text> : null}
          {!slotsLoading && (slotsData?.slots.length ?? 0) === 0 ? (
            <Text size="sm" tone="muted">No times available on this day.</Text>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {slotsData?.slots.map((slot) => (
              <Button
                key={slot}
                size="compact"
                variant={slot === selectedSlot ? "highlight" : "border"}
                onClick={() => setSelectedSlot(slot)}
              >
                <ButtonText>{formatSlotTime(slot, tz)}</ButtonText>
              </Button>
            ))}
          </div>
        </section>
      ) : null}

      {selectedSlot ? (
        <section className="flex flex-col gap-2">
          <Heading3>Your details</Heading3>
          <Input
            placeholder="Name"
            value={guestName}
            onChange={(event) => setGuestName(event.target.value)}
          />
          <Input
            type="email"
            placeholder="Email"
            value={guestEmail}
            onChange={(event) => setGuestEmail(event.target.value)}
          />
          <Input
            placeholder="Notes (optional)"
            value={guestNotes}
            onChange={(event) => setGuestNotes(event.target.value)}
          />
          {formError ? <Text size="sm" tone="danger">{formError}</Text> : null}
          <Button
            variant="highlight"
            disabled={submitting || guestName.length === 0 || guestEmail.length === 0}
            onClick={submit}
          >
            <ButtonText>{submitting ? "Booking…" : "Confirm booking"}</ButtonText>
          </Button>
        </section>
      ) : null}
    </div>
  );
}
