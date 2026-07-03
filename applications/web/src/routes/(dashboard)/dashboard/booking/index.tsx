import { useState } from "react";
import type { PropsWithChildren } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import useSWR from "swr";
import Copy from "lucide-react/dist/esm/icons/copy";
import CheckIcon from "lucide-react/dist/esm/icons/check";
import ExternalLink from "lucide-react/dist/esm/icons/external-link";
import { fetcher, apiFetch } from "@/lib/fetcher";
import { BackButton } from "@/components/ui/primitives/back-button";
import { DashboardHeading1, DashboardHeading2 } from "@/components/ui/primitives/dashboard-heading";
import { Text } from "@/components/ui/primitives/text";
import { Input } from "@/components/ui/primitives/input";
import { Button, ButtonText, ButtonIcon } from "@/components/ui/primitives/button";
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

interface EventTypeDetail extends EventTypeSummary {
  description: string | null;
  durationMinutes: number;
  timezone: string;
  destinationCalendarId: string;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  minNoticeMinutes: number;
  maxAdvanceDays: number;
  maxBookingsPerDay: number | null;
  conflictCalendarIds: string[] | null;
  locationType: string;
  locationValue: string | null;
  color: string | null;
}

interface CalendarOption {
  id: string;
  name: string;
  account: string;
}

const DURATION_PRESETS = [15, 30, 45, 60];
const DEFAULT_DURATION = 30;

export const Route = createFileRoute("/(dashboard)/dashboard/booking/")({
  component: BookingDashboard,
});

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const publicUrlFor = (slug: string, eventSlug: string): string =>
  `${globalThis.location.origin}/${slug}/${eventSlug}`;

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <Button size="compact" variant="border" className="shrink-0" onClick={copy}>
      <ButtonIcon>{copied ? <CheckIcon /> : <Copy />}</ButtonIcon>
      <ButtonText>{copied ? "Copied" : "Copy"}</ButtonText>
    </Button>
  );
}

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
        body: JSON.stringify({ slug: slugify(slug), displayName }),
      });
      onSaved();
    } catch (saveError) {
      setError(resolveErrorMessage(saveError, "Could not save your handle (the slug may be taken)."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Section title="Your booking handle" description="The public address of your booking links.">
      <div className="flex flex-col gap-2">
        <Input placeholder="handle (e.g. jane)" value={slug} onChange={(event) => setSlug(event.target.value)} />
        <Input placeholder="Display name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
        {slug ? (
          <Text size="xs" tone="muted">
            {globalThis.location.origin}/{slugify(slug)}/…
          </Text>
        ) : null}
        {error ? <Text size="sm" tone="danger">{error}</Text> : null}
        <Button
          variant="highlight"
          disabled={saving || slug.length === 0 || displayName.length === 0}
          onClick={save}
        >
          <ButtonText>{saving ? "Saving…" : profile ? "Update handle" : "Claim handle"}</ButtonText>
        </Button>
      </div>
    </Section>
  );
}

function LinkCard({
  eventType,
  profile,
  onChanged,
  onDuplicate,
}: {
  eventType: EventTypeSummary;
  profile: BookingProfile | null;
  onChanged: () => void;
  onDuplicate: (id: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const url = profile ? publicUrlFor(profile.slug, eventType.slug) : null;

  const toggleActive = async () => {
    setBusy(true);
    try {
      await apiFetch(`/api/v1/booking/event-types/${eventType.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !eventType.isActive }),
      });
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await apiFetch(`/api/v1/booking/event-types/${eventType.id}`, { method: "DELETE" });
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-3" data-inactive={eventType.isActive ? undefined : ""}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col">
          <Text className="truncate">{eventType.title}</Text>
          <Text size="xs" tone="muted">
            {eventType.durationMinutes} min · {eventType.isActive ? "Active" : "Paused"}
          </Text>
        </div>
        <Button size="compact" variant="border" disabled={busy} onClick={toggleActive}>
          <ButtonText>{eventType.isActive ? "Pause" : "Activate"}</ButtonText>
        </Button>
      </div>

      {url ? (
        <div className="flex items-center gap-1.5">
          <Text size="xs" tone="muted" className="min-w-0 flex-1 truncate font-mono">{url}</Text>
          <CopyButton value={url} />
          <a href={url} target="_blank" rel="noreferrer" aria-label="Open booking page">
            <Button size="compact" variant="border" className="shrink-0">
              <ButtonIcon><ExternalLink /></ButtonIcon>
            </Button>
          </a>
        </div>
      ) : (
        <Text size="xs" tone="muted">Claim your handle above to get a shareable link.</Text>
      )}

      <div className="flex gap-2">
        <Link to="/dashboard/booking/$eventTypeId" params={{ eventTypeId: eventType.id }} className="flex-1">
          <Button size="compact" variant="border" className="w-full"><ButtonText>Edit</ButtonText></Button>
        </Link>
        <Button size="compact" variant="border" className="flex-1" disabled={busy} onClick={() => onDuplicate(eventType.id)}>
          <ButtonText>Duplicate</ButtonText>
        </Button>
        <Button size="compact" variant="destructive" className="flex-1" disabled={busy} onClick={remove}>
          <ButtonText>Delete</ButtonText>
        </Button>
      </div>
    </div>
  );
}

function CreateEventType({ calendars, onCreated }: { calendars: CalendarOption[]; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState(DEFAULT_DURATION);
  const [destinationCalendarId, setDestinationCalendarId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const onTitleChange = (value: string) => {
    setTitle(value);
    if (!slugEdited) setSlug(slugify(value));
  };

  const create = async () => {
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/api/v1/booking/event-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, slug: slugify(slug), durationMinutes, timezone, destinationCalendarId }),
      });
      setTitle("");
      setSlug("");
      setSlugEdited(false);
      onCreated();
    } catch (createError) {
      setError(resolveErrorMessage(createError, "Could not create the link (the slug may be taken)."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Section title="New booking link" description="A reservable page with a fixed duration. Duplicate an existing one to offer the same call at different lengths.">
      <div className="flex flex-col gap-2">
        <Input placeholder="Title (e.g. Intro call)" value={title} onChange={(event) => onTitleChange(event.target.value)} />
        <Input
          placeholder="URL slug (e.g. intro)"
          value={slug}
          onChange={(event) => { setSlugEdited(true); setSlug(event.target.value); }}
        />
        <div className="flex flex-wrap gap-1.5">
          {DURATION_PRESETS.map((preset) => (
            <Button
              key={preset}
              size="compact"
              variant={durationMinutes === preset ? "highlight" : "border"}
              onClick={() => setDurationMinutes(preset)}
            >
              <ButtonText>{preset}m</ButtonText>
            </Button>
          ))}
          <Input
            type="number"
            className="w-20"
            value={durationMinutes}
            onChange={(event) => setDurationMinutes(Number(event.target.value))}
          />
        </div>
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
          disabled={saving || title.length === 0 || slugify(slug).length === 0 || destinationCalendarId.length === 0 || durationMinutes <= 0}
          onClick={create}
        >
          <ButtonText>{saving ? "Creating…" : "Create link"}</ButtonText>
        </Button>
      </div>
    </Section>
  );
}

function BookingDashboard() {
  const navigate = useNavigate();
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

  const duplicate = async (id: string) => {
    const detail = await fetcher<EventTypeDetail>(`/api/v1/booking/event-types/${id}`);
    const existing = new Set(eventTypes.map((eventType) => eventType.slug));
    let candidate = `${detail.slug}-copy`;
    let counter = 2;
    while (existing.has(candidate)) {
      candidate = `${detail.slug}-copy-${counter}`;
      counter += 1;
    }

    const created = await apiFetch("/api/v1/booking/event-types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `${detail.title} (copy)`,
        slug: candidate,
        durationMinutes: detail.durationMinutes,
        timezone: detail.timezone,
        destinationCalendarId: detail.destinationCalendarId,
        description: detail.description ?? undefined,
        bufferBeforeMinutes: detail.bufferBeforeMinutes,
        bufferAfterMinutes: detail.bufferAfterMinutes,
        minNoticeMinutes: detail.minNoticeMinutes,
        maxAdvanceDays: detail.maxAdvanceDays,
        maxBookingsPerDay: detail.maxBookingsPerDay,
        conflictCalendarIds: detail.conflictCalendarIds,
        locationType: detail.locationType,
        locationValue: detail.locationValue,
        color: detail.color,
        isActive: detail.isActive,
      }),
    }).then((response) => response.json() as Promise<EventTypeDetail>);

    await mutateEventTypes();
    // Land on the new link's editor so the user can tweak duration/slug.
    void navigate({ to: "/dashboard/booking/$eventTypeId", params: { eventTypeId: created.id } });
  };

  return (
    <div className="flex flex-col gap-4">
      <BackButton fallback="/dashboard" />
      <DashboardHeading1>Booking</DashboardHeading1>

      <ProfileClaim profile={profile} onSaved={mutateProfile} />

      <Section title="Your links">
        <div className="flex flex-col gap-2">
          {eventTypes.length === 0 ? (
            <Text size="sm" tone="muted">No links yet. Create one below.</Text>
          ) : null}
          {eventTypes.map((eventType) => (
            <LinkCard
              key={eventType.id}
              eventType={eventType}
              profile={profile}
              onChanged={mutateEventTypes}
              onDuplicate={duplicate}
            />
          ))}
        </div>
      </Section>

      {calendars.length > 0 ? (
        <CreateEventType calendars={calendars} onCreated={mutateEventTypes} />
      ) : (
        <Text size="sm" tone="muted">Connect a calendar first to create booking links.</Text>
      )}
    </div>
  );
}
