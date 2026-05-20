import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

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

export function formatUtcOffsetLabel(timezoneName: string): string {
  const now = dayjs().tz(timezoneName);
  const offsetMinutes = now.utcOffset();
  if (offsetMinutes === 0) return "UTC";
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMinutes);
  const hours = Math.floor(abs / 60);
  const minutes = abs % 60;
  if (minutes === 0) return `UTC${sign}${hours}`;
  return `UTC${sign}${hours}:${String(minutes).padStart(2, "0")}`;
}

export function nowInTimezone(timezoneName: string) {
  return dayjs().tz(timezoneName);
}
