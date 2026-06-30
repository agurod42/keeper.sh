import { useState } from "react";
import type { PropsWithChildren } from "react";
import { createFileRoute } from "@tanstack/react-router";
import useSWR from "swr";
import { fetcher, apiFetch } from "@/lib/fetcher";
import { BackButton } from "@/components/ui/primitives/back-button";
import { DashboardHeading1, DashboardHeading2 } from "@/components/ui/primitives/dashboard-heading";
import { Text } from "@/components/ui/primitives/text";
import { Input } from "@/components/ui/primitives/input";
import { Button, ButtonText } from "@/components/ui/primitives/button";
import { resolveErrorMessage } from "@/utils/errors";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MINUTES_PER_HOUR = 60;
const DEFAULT_START_MINUTE = 540;
const DEFAULT_END_MINUTE = 1020;

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

interface EventType {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  durationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  minNoticeMinutes: number;
  maxAdvanceDays: number;
  timezone: string;
  destinationCalendarId: string;
  conflictCalendarIds: string[] | null;
  locationType: string;
  locationValue: string | null;
  isActive: boolean;
}

interface AvailabilityRule {
  weekday: number;
  startMinute: number;
  endMinute: number;
}

interface CalendarOption {
  id: string;
  name: string;
  account: string;
}

export const Route = createFileRoute("/(dashboard)/dashboard/booking/$eventTypeId")({
  component: EventTypeEditor,
});

const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  const mins = minutes % MINUTES_PER_HOUR;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
};

const timeToMinutes = (value: string): number => {
  const [hours, mins] = value.split(":").map(Number);
  return (hours ?? 0) * MINUTES_PER_HOUR + (mins ?? 0);
};

function AvailabilityEditor({ eventTypeId }: { eventTypeId: string }) {
  const url = `/api/v1/booking/event-types/${eventTypeId}/availability`;
  const { data } = useSWR<{ rules: AvailabilityRule[] }>(url, fetcher);
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  // Seed local edit state once, the first time the server rules arrive.
  if (data && !loaded) {
    setLoaded(true);
    setRules(data.rules);
  }

  const addRow = (weekday: number) => {
    setRules((current) => [
      ...current,
      { weekday, startMinute: DEFAULT_START_MINUTE, endMinute: DEFAULT_END_MINUTE },
    ]);
  };

  const updateRow = (index: number, patch: Partial<AvailabilityRule>) => {
    setRules((current) => current.map((rule, position) => (position === index ? { ...rule, ...patch } : rule)));
  };

  const removeRow = (index: number) => {
    setRules((current) => current.filter((_, position) => position !== index));
  };

  const save = async () => {
    setStatus(null);
    try {
      await apiFetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rules }),
      });
      setStatus("Saved");
    } catch (error) {
      setStatus(resolveErrorMessage(error, "Could not save availability."));
    }
  };

  return (
    <Section title="Weekly availability" description="Times are in the event type's timezone.">
      <div className="flex flex-col gap-3">
        {WEEKDAYS.map((label, weekday) => (
          <div key={label} className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <Text size="sm">{label}</Text>
              <Button size="compact" variant="border" onClick={() => addRow(weekday)}>
                <ButtonText>Add</ButtonText>
              </Button>
            </div>
            {rules
              .map((rule, index) => ({ rule, index }))
              .filter((entry) => entry.rule.weekday === weekday)
              .map((entry) => (
                <div key={entry.index} className="flex items-center gap-2">
                  <input
                    type="time"
                    className="rounded-md border border-interactive-border bg-background px-2 py-1 text-sm"
                    value={minutesToTime(entry.rule.startMinute)}
                    onChange={(event) => updateRow(entry.index, { startMinute: timeToMinutes(event.target.value) })}
                  />
                  <Text size="sm" tone="muted">to</Text>
                  <input
                    type="time"
                    className="rounded-md border border-interactive-border bg-background px-2 py-1 text-sm"
                    value={minutesToTime(entry.rule.endMinute)}
                    onChange={(event) => updateRow(entry.index, { endMinute: timeToMinutes(event.target.value) })}
                  />
                  <Button size="compact" variant="ghost" onClick={() => removeRow(entry.index)}>
                    <ButtonText>Remove</ButtonText>
                  </Button>
                </div>
              ))}
          </div>
        ))}
        {status ? <Text size="sm" tone="muted">{status}</Text> : null}
        <Button variant="highlight" onClick={save}>
          <ButtonText>Save availability</ButtonText>
        </Button>
      </div>
    </Section>
  );
}

function EventTypeEditor() {
  const { eventTypeId } = Route.useParams();
  const { data: eventType, mutate } = useSWR<EventType>(
    `/api/v1/booking/event-types/${eventTypeId}`,
    fetcher,
  );
  const { data: calendars = [] } = useSWR<CalendarOption[]>("/api/v1/calendars", fetcher);
  // Local edits overlaid on the server snapshot; reset to {} after a save.
  const [edits, setEdits] = useState<Partial<EventType>>({});
  const [status, setStatus] = useState<string | null>(null);

  if (!eventType) {
    return <Text tone="muted">Loading…</Text>;
  }

  const draft: EventType = { ...eventType, ...edits };

  const update = (patch: Partial<EventType>) => {
    setEdits((current) => ({ ...current, ...patch }));
  };

  const toggleConflictCalendar = (id: string) => {
    const selected = new Set(draft.conflictCalendarIds ?? []);
    if (selected.has(id)) {
      selected.delete(id);
    } else {
      selected.add(id);
    }
    update({ conflictCalendarIds: selected.size === 0 ? null : [...selected] });
  };

  const save = async () => {
    setStatus(null);
    try {
      await apiFetch(`/api/v1/booking/event-types/${eventTypeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title,
          slug: draft.slug,
          description: draft.description,
          durationMinutes: draft.durationMinutes,
          bufferBeforeMinutes: draft.bufferBeforeMinutes,
          bufferAfterMinutes: draft.bufferAfterMinutes,
          minNoticeMinutes: draft.minNoticeMinutes,
          maxAdvanceDays: draft.maxAdvanceDays,
          timezone: draft.timezone,
          destinationCalendarId: draft.destinationCalendarId,
          conflictCalendarIds: draft.conflictCalendarIds,
          locationType: draft.locationType,
          locationValue: draft.locationValue,
          isActive: draft.isActive,
        }),
      });
      await mutate();
      setEdits({});
      setStatus("Saved");
    } catch (error) {
      setStatus(resolveErrorMessage(error, "Could not save the event type."));
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <BackButton fallback="/dashboard/booking" />
      <DashboardHeading1>{draft.title}</DashboardHeading1>

      <Section title="Details">
        <div className="flex flex-col gap-2">
          <Input value={draft.title} onChange={(event) => update({ title: event.target.value })} placeholder="Title" />
          <Input value={draft.slug} onChange={(event) => update({ slug: event.target.value })} placeholder="Slug" />
          <Input
            value={draft.description ?? ""}
            onChange={(event) => update({ description: event.target.value || null })}
            placeholder="Description"
          />
          <Input
            type="number"
            value={draft.durationMinutes}
            onChange={(event) => update({ durationMinutes: Number(event.target.value) })}
            placeholder="Duration (minutes)"
          />
          <div className="flex gap-2">
            <Input
              type="number"
              value={draft.bufferBeforeMinutes}
              onChange={(event) => update({ bufferBeforeMinutes: Number(event.target.value) })}
              placeholder="Buffer before"
            />
            <Input
              type="number"
              value={draft.bufferAfterMinutes}
              onChange={(event) => update({ bufferAfterMinutes: Number(event.target.value) })}
              placeholder="Buffer after"
            />
          </div>
          <div className="flex gap-2">
            <Input
              type="number"
              value={draft.minNoticeMinutes}
              onChange={(event) => update({ minNoticeMinutes: Number(event.target.value) })}
              placeholder="Min notice (minutes)"
            />
            <Input
              type="number"
              value={draft.maxAdvanceDays}
              onChange={(event) => update({ maxAdvanceDays: Number(event.target.value) })}
              placeholder="Max advance (days)"
            />
          </div>
          <Input value={draft.timezone} onChange={(event) => update({ timezone: event.target.value })} placeholder="Timezone" />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.isActive}
              onChange={(event) => update({ isActive: event.target.checked })}
            />
            Active
          </label>
        </div>
      </Section>

      <Section title="Destination calendar" description="Where new bookings are created.">
        <select
          className="rounded-md border border-interactive-border bg-background px-2 py-1.5 text-sm"
          value={draft.destinationCalendarId}
          onChange={(event) => update({ destinationCalendarId: event.target.value })}
        >
          {calendars.map((calendar) => (
            <option key={calendar.id} value={calendar.id}>
              {calendar.name} ({calendar.account})
            </option>
          ))}
        </select>
      </Section>

      <Section title="Conflict calendars" description="Checked calendars block availability. None checked = all.">
        <div className="flex flex-col gap-1">
          {calendars.map((calendar) => (
            <label key={calendar.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={(draft.conflictCalendarIds ?? []).includes(calendar.id)}
                onChange={() => toggleConflictCalendar(calendar.id)}
              />
              {calendar.name} ({calendar.account})
            </label>
          ))}
        </div>
      </Section>

      {status ? <Text size="sm" tone="muted">{status}</Text> : null}
      <Button variant="highlight" onClick={save}>
        <ButtonText>Save details</ButtonText>
      </Button>

      <AvailabilityEditor eventTypeId={eventTypeId} />
    </div>
  );
}
