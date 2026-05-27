import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)

/** Hours before `startAt` (UTC) required for a trial lesson cancellation refund. */
export const TRIAL_LESSON_CANCEL_REFUND_HOURS = 12

export function getTrialLessonHoursUntilStartUtc(
  startAt: string | Date,
  now: string | Date = new Date()
): number {
  return dayjs(startAt).utc().diff(dayjs(now).utc(), 'hour', true)
}

/** Matches API: refund when `startAt - now` is strictly more than 12 hours (UTC). */
export function isTrialLessonRefundEligible(
  startAt: string | Date,
  now: string | Date = new Date()
): boolean {
  return getTrialLessonHoursUntilStartUtc(startAt, now) > TRIAL_LESSON_CANCEL_REFUND_HOURS
}

/** Same 12h window as refund eligibility — used for student/tutor reschedule. */
export const isTrialLessonRescheduleEligible = isTrialLessonRefundEligible

export function formatTrialLessonHoursUntilStart(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) {
    return '0'
  }
  if (hours >= 10) {
    return String(Math.floor(hours))
  }
  const rounded = Math.round(hours * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}
