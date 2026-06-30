const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 86_400_000;
const MINUTES_PER_HOUR = 60;
const HOURS_IN_DAY = 24;

interface BusyInterval {
  start: Date;
  end: Date;
}

interface AvailabilityRule {
  weekday: number;
  startMinute: number;
  endMinute: number;
}

interface SlotComputationInput {
  /** Requested day as `YYYY-MM-DD`, interpreted in `hostTimezone`. */
  date: string;
  /** IANA timezone the availability rules are expressed in. */
  hostTimezone: string;
  durationMinutes: number;
  rules: AvailabilityRule[];
  /** Busy intervals (UTC) to subtract; includes existing bookings. */
  busy: BusyInterval[];
  /** Current instant; slots before `now + minNotice` are dropped. */
  now: Date;
  minNoticeMinutes: number;
  maxAdvanceDays: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
}

interface WallClockParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

/** Wall-clock parts of `instant` as observed in `timeZone`. */
const partsInTimeZone = (instant: Date, timeZone: string): WallClockParts => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const lookup = new Map<string, string>();
  for (const part of formatter.formatToParts(instant)) {
    lookup.set(part.type, part.value);
  }

  const read = (type: string): number => Number.parseInt(lookup.get(type) ?? "0", 10);

  // Intl can report midnight as hour "24"; normalize it back to 0.
  let hour = read("hour");
  if (hour === HOURS_IN_DAY) {
    hour = 0;
  }

  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour,
    minute: read("minute"),
  };
};

/** Offset (ms) between `timeZone` wall clock and the instant: wall - instant. */
const offsetMsAt = (instant: Date, timeZone: string): number => {
  const parts = partsInTimeZone(instant, timeZone);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
  return asUtc - instant.getTime();
};

/**
 * Convert a wall-clock time in `timeZone` to the absolute UTC instant.
 *
 * Two-pass: guess the offset by treating the wall time as UTC, then re-read the
 * offset at the candidate instant so DST transitions resolve correctly.
 * `minutesFromMidnight` may equal 1440 (end-of-day), which rolls into the next
 * calendar day via `Date.UTC` overflow.
 */
const zonedWallTimeToUtc = (
  year: number,
  month: number,
  day: number,
  minutesFromMidnight: number,
  timeZone: string,
): Date => {
  const hour = Math.floor(minutesFromMidnight / MINUTES_PER_HOUR);
  const minute = minutesFromMidnight % MINUTES_PER_HOUR;
  const naiveUtc = Date.UTC(year, month - 1, day, hour, minute);
  const firstOffset = offsetMsAt(new Date(naiveUtc), timeZone);
  let instant = naiveUtc - firstOffset;
  const secondOffset = offsetMsAt(new Date(instant), timeZone);
  if (secondOffset !== firstOffset) {
    instant = naiveUtc - secondOffset;
  }
  return new Date(instant);
};

const parseDateParts = (date: string): { year: number; month: number; day: number } => {
  const [year, month, day] = date.split("-").map((value) => Number.parseInt(value, 10));
  return { year: year ?? 0, month: month ?? 0, day: day ?? 0 };
};

/** UTC instants bounding the requested calendar day in `timeZone`. */
const dayRangeInTimeZone = (
  date: string,
  timeZone: string,
): { from: Date; to: Date } => {
  const { year, month, day } = parseDateParts(date);
  return {
    from: zonedWallTimeToUtc(year, month, day, 0, timeZone),
    to: zonedWallTimeToUtc(year, month, day, HOURS_IN_DAY * MINUTES_PER_HOUR, timeZone),
  };
};

const padTwo = (value: number): string => value.toString().padStart(2, "0");

/** The `YYYY-MM-DD` calendar date an instant falls on, in `timeZone`. */
const formatDateInTimeZone = (instant: Date, timeZone: string): string => {
  const parts = partsInTimeZone(instant, timeZone);
  return `${parts.year}-${padTwo(parts.month)}-${padTwo(parts.day)}`;
};

/** Day of week (0=Sunday … 6=Saturday) for a `YYYY-MM-DD` calendar date. */
const weekdayForDate = (date: string): number => {
  const { year, month, day } = parseDateParts(date);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
};

const overlapsBusy = (
  paddedStart: Date,
  paddedEnd: Date,
  busy: BusyInterval[],
): boolean =>
  busy.some((interval) => paddedStart < interval.end && interval.start < paddedEnd);

/**
 * Compute free booking slot start instants (UTC) for a single day.
 *
 * All timezone math is explicit: availability rules are resolved against the
 * host timezone; the returned instants are absolute and rendered in the guest's
 * timezone by the client. The function is pure — every external input (busy
 * intervals, `now`) is passed in.
 */
const computeAvailableSlots = (input: SlotComputationInput): Date[] => {
  const {
    date,
    hostTimezone,
    durationMinutes,
    rules,
    busy,
    now,
    minNoticeMinutes,
    maxAdvanceDays,
    bufferBeforeMinutes,
    bufferAfterMinutes,
  } = input;

  if (durationMinutes <= 0) {
    return [];
  }

  const { year, month, day } = parseDateParts(date);
  const weekday = weekdayForDate(date);
  const earliest = new Date(now.getTime() + minNoticeMinutes * MS_PER_MINUTE);
  const latest = new Date(now.getTime() + maxAdvanceDays * MS_PER_DAY);
  const stepMs = durationMinutes * MS_PER_MINUTE;

  const slots: Date[] = [];

  for (const rule of rules) {
    if (rule.weekday !== weekday || rule.endMinute <= rule.startMinute) {
      continue;
    }

    const windowStart = zonedWallTimeToUtc(year, month, day, rule.startMinute, hostTimezone);
    const windowEnd = zonedWallTimeToUtc(year, month, day, rule.endMinute, hostTimezone);

    for (
      let slotStart = windowStart.getTime();
      slotStart + stepMs <= windowEnd.getTime();
      slotStart += stepMs
    ) {
      const slotStartDate = new Date(slotStart);

      if (slotStartDate < earliest || slotStartDate > latest) {
        continue;
      }

      const paddedStart = new Date(slotStart - bufferBeforeMinutes * MS_PER_MINUTE);
      const paddedEnd = new Date(slotStart + stepMs + bufferAfterMinutes * MS_PER_MINUTE);
      if (overlapsBusy(paddedStart, paddedEnd, busy)) {
        continue;
      }

      slots.push(slotStartDate);
    }
  }

  // Deduplicate identical starts produced by overlapping rules, then sort.
  const uniqueByTime = new Map<number, Date>();
  for (const slot of slots) {
    uniqueByTime.set(slot.getTime(), slot);
  }
  return [...uniqueByTime.values()].toSorted(
    (left, right) => left.getTime() - right.getTime(),
  );
};

export {
  computeAvailableSlots,
  dayRangeInTimeZone,
  formatDateInTimeZone,
  weekdayForDate,
  zonedWallTimeToUtc,
};
export type { AvailabilityRule, BusyInterval, SlotComputationInput };
