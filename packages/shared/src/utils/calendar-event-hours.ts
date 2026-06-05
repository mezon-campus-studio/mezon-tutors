import type { Dayjs } from 'dayjs'

export const CALENDAR_LAST_HOUR_TICK = 23

export const CALENDAR_DAY_END_HOUR = 24

export function filterCalendarWeekHourTicks(hours: number[]): number[] {
  return hours.filter((h) => h >= 0 && h <= CALENDAR_LAST_HOUR_TICK)
}

export function addCalendarEventHourTicks(
  hourSet: Set<number>,
  startHour: number,
  endHour: number,
): void {
  const effectiveEnd =
    endHour <= startHour ? CALENDAR_DAY_END_HOUR : endHour
  const start = Math.floor(startHour)
  const lastTick = Math.min(
    CALENDAR_LAST_HOUR_TICK,
    Math.max(start, Math.ceil(effectiveEnd) - 1),
  )
  for (let h = start; h <= lastTick; h++) {
    hourSet.add(h)
  }
}

export function roundToHalfHour(hour: number): number {
  const wholeHour = Math.floor(hour)
  const minutes = (hour - wholeHour) * 60

  if (minutes < 15) {
    return wholeHour
  }
  if (minutes < 45) {
    return wholeHour + 0.5
  }
  return wholeHour + 1
}

export function calendarEventHoursFromDayjs(start: Dayjs, end: Dayjs): {
  startHour: number
  endHour: number
} {
  const startHour = roundToHalfHour(start.hour() + start.minute() / 60)

  if (!end.isSame(start, 'day')) {
    return { startHour, endHour: CALENDAR_DAY_END_HOUR }
  }

  let endHour = roundToHalfHour(end.hour() + end.minute() / 60)

  if (endHour <= startHour && end.isAfter(start)) {
    endHour = CALENDAR_DAY_END_HOUR
  } else if (endHour <= startHour) {
    endHour = Math.min(CALENDAR_DAY_END_HOUR, startHour + 0.5)
  }

  return { startHour, endHour }
}

export function calendarEventHoursFromDecimals(
  startHour: number,
  endHour: number,
): { startHour: number; endHour: number } {
  const roundedStart = roundToHalfHour(startHour)
  let roundedEnd = roundToHalfHour(endHour)

  if (roundedEnd <= roundedStart) {
    roundedEnd = CALENDAR_DAY_END_HOUR
  }

  return { startHour: roundedStart, endHour: roundedEnd }
}

export function normalizeCalendarEventEndHour(
  startHour: number,
  endHour: number,
): number {
  if (endHour > startHour) {
    return endHour
  }
  return Math.min(CALENDAR_DAY_END_HOUR, Math.max(startHour + 0.5, CALENDAR_DAY_END_HOUR))
}
