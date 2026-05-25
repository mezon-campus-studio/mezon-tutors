import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

/** Hours before lesson start required for refund (matches API, compared in UTC). */
export const TRIAL_LESSON_CANCEL_REFUND_HOURS = 12;

export function getTrialLessonHoursUntilStartUtc(
  startAt: string | Date,
  now: string | Date = new Date(),
): number {
  return dayjs(startAt).utc().diff(dayjs(now).utc(), "hour", true);
}

export function isTrialLessonRefundEligible(
  startAt: string | Date,
  now: string | Date = new Date(),
): boolean {
  return (
    getTrialLessonHoursUntilStartUtc(startAt, now) >
    TRIAL_LESSON_CANCEL_REFUND_HOURS
  );
}

export function formatTrialLessonHoursUntilStart(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) {
    return "0";
  }
  if (hours >= 10) {
    return String(Math.floor(hours));
  }
  const rounded = Math.round(hours * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}
