import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)

export function getTrialLessonHoursUntilStartUtc(
  startAt: string | Date,
  now: string | Date = new Date()
): number {
  return dayjs.utc(startAt).diff(dayjs.utc(now), 'hour', true)
}

export function isTrialLessonRefundEligible(
  startAt: string | Date,
  now: string | Date,
  lessonChangePeriodHours: number,
): boolean {
  return getTrialLessonHoursUntilStartUtc(startAt, now) > lessonChangePeriodHours
}

export function isTrialLessonRescheduleEligible(
  startAt: string | Date,
  now: string | Date,
  lessonChangePeriodHours: number,
): boolean {
  return isTrialLessonRefundEligible(startAt, now, lessonChangePeriodHours)
}

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
