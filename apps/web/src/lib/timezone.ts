import dayjs, { type Dayjs } from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { parseTimeParts } from "@mezon-tutors/shared";

dayjs.extend(utc);
dayjs.extend(timezone);

export const FALLBACK_TIMEZONE = "UTC";

export function detectBrowserTimezone(): string {
  if (typeof window === "undefined") return FALLBACK_TIMEZONE;
  return Intl.DateTimeFormat().resolvedOptions().timeZone || FALLBACK_TIMEZONE;
}

export function resolveUserTimezone(
  userTimezone?: string | null,
  browserTimezone?: string,
): string {
  return userTimezone || browserTimezone || FALLBACK_TIMEZONE;
}

export function isValidIanaTimezone(timezoneName: string): boolean {
  try {
    Intl.DateTimeFormat("en-US", { timeZone: timezoneName }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function normalizeTimezoneParam(
  value: string | null | undefined,
): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed || !isValidIanaTimezone(trimmed)) {
    return undefined;
  }
  return trimmed;
}

/** Timezone safe for SSR when user profile is not hydrated yet. */
export function resolveStableTimezone(
  userTimezone?: string | null,
  queryTimezone?: string | null,
): string | undefined {
  const fromUser = normalizeTimezoneParam(userTimezone ?? undefined);
  if (fromUser) return fromUser;
  return normalizeTimezoneParam(queryTimezone ?? undefined);
}

export function formatInstantForLocale(
  iso: string,
  timezoneName: string,
  locale: string,
): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezoneName,
  }).format(date);
}

export function formatInstantRangeLabels(
  startAtIso: string,
  durationMinutes: number,
  timezoneName: string,
): { dateLabel: string; timeLabel: string } {
  const start = dayjs.utc(startAtIso).tz(timezoneName);
  const end = start.add(durationMinutes, "minute");
  return {
    dateLabel: start.format("MMM D, YYYY"),
    timeLabel: `${start.format("h:mm A")} - ${end.format("h:mm A")}`,
  };
}

export function convertWallClockSlotBetweenTimezones(
  date: string,
  startTime: string,
  endTime: string,
  fromTimezone: string,
  toTimezone: string,
): { date: string; startTime: string; endTime: string } {
  const start = dayjs.tz(
    `${date} ${startTime}`,
    "YYYY-MM-DD HH:mm",
    fromTimezone,
  );
  const end = dayjs.tz(`${date} ${endTime}`, "YYYY-MM-DD HH:mm", fromTimezone);
  const startInTarget = start.tz(toTimezone);
  const endInTarget = end.tz(toTimezone);
  return {
    date: startInTarget.format("YYYY-MM-DD"),
    startTime: startInTarget.format("HH:mm"),
    endTime: endInTarget.format("HH:mm"),
  };
}

export function getTimezoneUtcOffsetMinutes(timezoneName: string): number {
  return dayjs().tz(timezoneName).utcOffset();
}

export function formatUtcOffsetLabel(timezoneName: string): string {
  const offsetMinutes = getTimezoneUtcOffsetMinutes(timezoneName);
  if (offsetMinutes === 0) return "UTC";
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMinutes);
  const hours = Math.floor(abs / 60);
  const minutes = abs % 60;
  if (minutes === 0) return `UTC${sign}${hours}`;
  return `UTC${sign}${hours}:${String(minutes).padStart(2, "0")}`;
}

export function nowInTimezone(timezoneName: string): Dayjs {
  return dayjs().tz(timezoneName);
}

export function startOfTodayInTimezone(timezoneName: string): Dayjs {
  return nowInTimezone(timezoneName).startOf("day");
}

export function parseYmdInTimezone(ymd: string, timezoneName: string): Dayjs {
  return dayjs.tz(ymd, "YYYY-MM-DD", timezoneName);
}

export function getWeekStartMondayInTimezone(
  timezoneName: string,
  ref?: Dayjs,
): Dayjs {
  const today = (ref ?? nowInTimezone(timezoneName)).startOf("day");
  const jsDay = today.day();
  const distanceToMonday = jsDay === 0 ? 6 : jsDay - 1;
  return today.subtract(distanceToMonday, "day");
}

export function addCalendarDays(
  ymd: string,
  days: number,
  timezoneName: string,
): Dayjs {
  return parseYmdInTimezone(ymd, timezoneName).add(days, "day");
}

export function formatWallClockTime12h(hhmm: string): string {
  const { hour, minute } = parseTimeParts(hhmm);
  return dayjs().hour(hour).minute(minute).second(0).format("h:mm A");
}

export function formatWeekdayShort(
  ymd: string,
  timezoneName: string,
  locale = "en-US",
): string {
  const anchor = dayjs.tz(`${ymd} 12:00`, "YYYY-MM-DD HH:mm", timezoneName);
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: timezoneName,
  }).format(anchor.toDate());
}
