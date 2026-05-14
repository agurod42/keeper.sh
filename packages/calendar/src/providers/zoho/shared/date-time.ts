/**
 * Zoho Calendar date/time formats — empirically validated 2026-05-13.
 *
 * Zoho uses two related "basic ISO 8601" formats (no separators):
 *   - POST/PUT body inputs: `YYYYMMDDTHHMMSSZ`         e.g. `20300615T100000Z`
 *   - GET response sometimes: `YYYYMMDDTHHMMSS+0000`   e.g. `20300615T100000+0000`
 *   - All-day events:        `YYYYMMDD`                e.g. `20300615`
 *
 * `parseZohoBasicDateTime` accepts any of those shapes and returns a Date.
 * `formatZohoBasicDateTime` always emits the Z-suffixed UTC form, which Zoho
 * accepts on writes regardless of the user's timezone.
 */

import type { PartialZohoDateTime, ZohoDateTime } from "../types";

const DIGITS_FOR_DATE_ONLY = 8;
const PAD_WIDTH = 2;
const PAD_CHAR = "0";

const padTwo = (value: number): string => value.toString().padStart(PAD_WIDTH, PAD_CHAR);

const matchBasicDateTime = (value: string):
  | { year: number; month: number; day: number; hour: number; minute: number; second: number }
  | null => {
  const compactPattern = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z|[+-]\d{4})?$/;
  const match = compactPattern.exec(value);
  if (!match) {
    return null;
  }
  const [, year, month, day, hour, minute, second] = match;
  return {
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
    month: Number(month),
    second: Number(second),
    year: Number(year),
  };
};

const matchDateOnly = (value: string): { year: number; month: number; day: number } | null => {
  if (value.length !== DIGITS_FOR_DATE_ONLY || !/^\d{8}$/.test(value)) {
    return null;
  }
  return {
    day: Number(value.slice(6, 8)),
    month: Number(value.slice(4, 6)),
    year: Number(value.slice(0, 4)),
  };
};

const parseOffsetMinutes = (offsetSegment: string | undefined): number => {
  if (!offsetSegment || offsetSegment === "Z") {
    return 0;
  }
  const sign = offsetSegment.startsWith("-") ? -1 : 1;
  const hours = Number(offsetSegment.slice(1, 3));
  const minutes = Number(offsetSegment.slice(3, 5));
  return sign * (hours * 60 + minutes);
};

/**
 * Parse a Zoho basic-ISO date/time string into a Date.
 * Falls back to `new Date(value)` for unrecognized shapes so callers don't
 * silently lose precision when Zoho returns something we don't model yet.
 */
const parseZohoBasicDateTime = (value: string): Date => {
  const dateOnly = matchDateOnly(value);
  if (dateOnly) {
    return new Date(Date.UTC(dateOnly.year, dateOnly.month - 1, dateOnly.day, 0, 0, 0, 0));
  }

  const compact = matchBasicDateTime(value);
  if (compact) {
    const offsetSegment = value.slice(15);
    const offsetMinutes = parseOffsetMinutes(offsetSegment);
    const utcMs = Date.UTC(
      compact.year,
      compact.month - 1,
      compact.day,
      compact.hour,
      compact.minute,
      compact.second,
      0,
    );
    return new Date(utcMs - offsetMinutes * 60 * 1000);
  }

  return new Date(value);
};

/**
 * Format a Date as a Zoho-accepted basic-ISO UTC string.
 * Zoho's POST/PUT eventdata always accepts `YYYYMMDDTHHMMSSZ` regardless of
 * the event's intended timezone — the `timezone` field on `dateandtime`
 * carries the calendar-local zone separately.
 *
 * The `timezone` parameter is accepted for API symmetry with the parse helper
 * and future-proofing, but is intentionally unused: the date already encodes
 * a UTC instant.
 */
const formatZohoBasicDateTime = (value: Date, _timezone: string): string => {
  const year = value.getUTCFullYear().toString().padStart(4, PAD_CHAR);
  const month = padTwo(value.getUTCMonth() + 1);
  const day = padTwo(value.getUTCDate());
  const hour = padTwo(value.getUTCHours());
  const minute = padTwo(value.getUTCMinutes());
  const second = padTwo(value.getUTCSeconds());
  return `${year}${month}${day}T${hour}${minute}${second}Z`;
};

/**
 * Format an all-day date for Zoho. All-day eventdata expects `YYYYMMDD`
 * with no time component for both start and end.
 */
const formatZohoBasicDate = (value: Date): string => {
  const year = value.getUTCFullYear().toString().padStart(4, PAD_CHAR);
  const month = padTwo(value.getUTCMonth() + 1);
  const day = padTwo(value.getUTCDate());
  return `${year}${month}${day}`;
};

const parseEventDateTime = (eventTime: ZohoDateTime, field: "start" | "end"): Date | null => {
  const value = eventTime[field];
  if (!value) {
    return null;
  }
  return parseZohoBasicDateTime(value);
};

const parseEventTime = (time: PartialZohoDateTime | undefined, field: "start" | "end"): Date | null => {
  if (!time) {
    return null;
  }
  const value = time[field];
  if (!value) {
    return null;
  }
  return parseZohoBasicDateTime(value);
};

export {
  parseZohoBasicDateTime,
  formatZohoBasicDateTime,
  formatZohoBasicDate,
  parseEventDateTime,
  parseEventTime,
};
