import { useState } from "react";
import type { PropsWithChildren } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import useSWR from "swr";
import { fetcher, apiFetch } from "@/lib/fetcher";
import { BackButton } from "@/components/ui/primitives/back-button";
import { DashboardHeading1, DashboardHeading2 } from "@/components/ui/primitives/dashboard-heading";
import { Text } from "@/components/ui/primitives/text";
import { Input } from "@/components/ui/primitives/input";
import { Button, ButtonText } from "@/components/ui/primitives/button";
import { resolveErrorMessage } from "@/utils/errors";

interface SectionProps {
  title: string;
  description?: string;
}

function Section({ title, description, children }: PropsWithChildren<SectionProps>) {
  return (
    <section className="flex flex-col gap-2 pt-2">
      <DashboardHeading2>{title}</DashboardHeading2>
      {description ? <Text size="sm" tone="muted">{description}</Text> : null}
      {children}
    </section>
  );
}

interface BookingProfile {
  slug: string;
  displayName: string;
  avatarUrl: string | null;
}

interface EventTypeSummary {
  id: string;
  slug: string;
  title: string;
  durationMinutes: number;
  isActive: boolean;
}

interface CalendarOption {
  id: string;
  name: string;
  account: string;
}

const DEFAULT_DURATION = 30;

export const Route = createFileRoute("/(dashboard)/dashboard/booking/")({
  component: BookingDashboard,
});

const publicUrlFor = (slug: string, eventSlug: string): string =>
  `${globalThis.location.origin}/${slug}/${eventSlug}`;

function ProfileClaim({ profile, onSaved }: { profile: BookingProfile | null; onSaved: () => void }) {
  const [slug, setSlug] = useState(profile?.slug ?? "");
  const [displayName, setDisplayName] = useState(profile?.displayName ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/api/v1/booking/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, displayName }),
      });
      onSaved();
    } catch (saveError) {
      setError(resolveErrorMessage(saveError, "Could not save your handle (the slug may be taken)."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Section title="Your booking handle" description="The public address of your pages.">
      <div className="flex flex-col gap-2">
        <Input placeholder="handle (e.g. jane)" value={slug} onChange={(event) => setSlug(event.target.value)} />
        <Input placeholder="Display name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
        {error ? <Text size="sm" tone="danger">{error}</Text> : null}
        <Button
          variant="highlight"
          disabled={saving || slug.length === 0 || displayName.length === 0}
          onClick={save}
        >
          <ButtonText>{saving ? "Saving…" : "Save handle"}</ButtonText>
        </Button>
      </div>
    </Section>
  );
}

function CreateEventType({ calendars, onCreated }: { calendars: CalendarOption[]; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(DEFAULT_DURATION);
  const [destinationCalendarId, setDestinationCalendarId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const create = async () => {
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/api/v1/booking/event-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, slug, durationMinutes, timezone, destinationCalendarId }),
      });
      setTitle("");
      setSlug("");
      onCreated();
    } catch (createError) {
      setError(resolveErrorMessage(createError, "Could not create the event type."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Section title="New event type" description="A reservable page with a fixed duration.">
      <div className="flex flex-col gap-2">
        <Input placeholder="Title (e.g. Intro call)" value={title} onChange={(event) => setTitle(event.target.value)} />
        <Input placeholder="URL slug (e.g. intro)" value={slug} onChange={(event) => setSlug(event.target.value)} />
        <Input
          type="number"
          placeholder="Duration (minutes)"
          value={durationMinutes}
          onChange={(event) => setDurationMinutes(Number(event.target.value))}
        />
        <select
          className="rounded-md border border-interactive-border bg-background px-2 py-1.5 text-sm"
          value={destinationCalendarId}
          onChange={(event) => setDestinationCalendarId(event.target.value)}
        >
          <option value="">Destination calendar…</option>
          {calendars.map((calendar) => (
            <option key={calendar.id} value={calendar.id}>
              {calendar.name} ({calendar.account})
            </option>
          ))}
        </select>
        {error ? <Text size="sm" tone="danger">{error}</Text> : null}
        <Button
          variant="highlight"
          disabled={saving || title.length === 0 || slug.length === 0 || destinationCalendarId.length === 0}
          onClick={create}
        >
          <ButtonText>{saving ? "Creating…" : "Create event type"}</ButtonText>
        </Button>
      </div>
    </Section>
  );
}

function BookingDashboard() {
  const { data: profileData, mutate: mutateProfile } = useSWR<{ profile: BookingProfile | null }>(
    "/api/v1/booking/profile",
    fetcher,
  );
  const { data: eventTypesData, mutate: mutateEventTypes } = useSWR<{ eventTypes: EventTypeSummary[] }>(
    "/api/v1/booking/event-types",
    fetcher,
  );
  const { data: calendars = [] } = useSWR<CalendarOption[]>("/api/v1/calendars", fetcher);

  const profile = profileData?.profile ?? null;
  const eventTypes = eventTypesData?.eventTypes ?? [];

  const remove = async (id: string) => {
    await apiFetch(`/api/v1/booking/event-types/${id}`, { method: "DELETE" });
    await mutateEventTypes();
  };

  return (
    <div className="flex flex-col gap-4">
      <BackButton fallback="/dashboard" />
      <DashboardHeading1>Booking pages</DashboardHeading1>

      <ProfileClaim profile={profile} onSaved={mutateProfile} />

      <Section title="Event types">
        <div className="flex flex-col gap-2">
          {eventTypes.length === 0 ? (
            <Text size="sm" tone="muted">No event types yet.</Text>
          ) : null}
          {eventTypes.map((eventType) => (
            <div key={eventType.id} className="flex flex-col gap-1 rounded-md border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <Text>{eventType.title}</Text>
                <div className="flex gap-2">
                  <Link to="/dashboard/booking/$eventTypeId" params={{ eventTypeId: eventType.id }}>
                    <Button size="compact" variant="border"><ButtonText>Edit</ButtonText></Button>
                  </Link>
                  <Button size="compact" variant="destructive" onClick={() => remove(eventType.id)}>
                    <ButtonText>Delete</ButtonText>
                  </Button>
                </div>
              </div>
              <Text size="xs" tone="muted">
                {eventType.durationMinutes} min · {eventType.isActive ? "active" : "inactive"}
              </Text>
              {profile ? (
                <Text size="xs" tone="muted">{publicUrlFor(profile.slug, eventType.slug)}</Text>
              ) : null}
            </div>
          ))}
        </div>
      </Section>

      {calendars.length > 0 ? (
        <CreateEventType calendars={calendars} onCreated={mutateEventTypes} />
      ) : (
        <Text size="sm" tone="muted">Connect a calendar first to create event types.</Text>
      )}
    </div>
  );
}
