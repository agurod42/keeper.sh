import type { SyncableEvent } from "../../../core/types";
import { resolveIsAllDayEvent } from "../../../core/events/all-day";
import { formatZohoBasicDate, formatZohoBasicDateTime } from "../shared/date-time";

interface ZohoEventDataPayload {
  title: string;
  dateandtime: {
    start: string;
    end: string;
    timezone: string;
  };
  isallday: boolean;
  description?: string;
  location?: string;
}

/**
 * Builds the `eventdata` JSON payload that Zoho's POST/PUT endpoints expect.
 * The caller is responsible for wrapping this in a `URLSearchParams` body
 * (Content-Type: application/x-www-form-urlencoded) — see destination/provider.
 *
 * All-day events use date-only strings (`YYYYMMDD`); timed events use the
 * `YYYYMMDDTHHMMSSZ` form. The `timezone` field carries the calendar-local
 * zone separately from the instant-on-the-wire.
 */
const buildZohoEventData = (event: SyncableEvent): ZohoEventDataPayload => {
  const isAllDay = resolveIsAllDayEvent(event);
  const timezone = event.startTimeZone ?? "UTC";

  const dateandtime = isAllDay
    ? {
        end: formatZohoBasicDate(event.endTime),
        start: formatZohoBasicDate(event.startTime),
        timezone,
      }
    : {
        end: formatZohoBasicDateTime(event.endTime, timezone),
        start: formatZohoBasicDateTime(event.startTime, timezone),
        timezone,
      };

  const payload: ZohoEventDataPayload = {
    dateandtime,
    isallday: isAllDay,
    title: event.summary,
  };

  if (event.description) {
    payload.description = event.description;
  }

  if (event.location) {
    payload.location = event.location;
  }

  return payload;
};

const serializeZohoEvent = (event: SyncableEvent): string => JSON.stringify(buildZohoEventData(event));

export { serializeZohoEvent, buildZohoEventData };
export type { ZohoEventDataPayload };
