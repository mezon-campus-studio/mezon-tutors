import dayjs, { type Dayjs } from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { minutesToTime, timeToMinutes } from './date-time'

dayjs.extend(utc)
dayjs.extend(timezone)

/** `tutor_availability` rows use Monday=0 … Sunday=6 wall-clock times in UTC. */
export const TUTOR_AVAILABILITY_STORAGE_TIMEZONE = 'UTC' as const

export type WeeklyAvailabilitySlot = {
  dayOfWeek: number
  startTime: string
  endTime: string
  isActive?: boolean
}

export type CalendarAvailabilitySlot = {
  date: string
  startTime: string
  endTime: string
}

export function dbDayOfWeekFromDayjs(d: Dayjs): number {
  return (d.day() + 6) % 7
}

export function getWeekMondayUtc(ref?: Dayjs): Dayjs {
  const today = (ref ?? dayjs.utc()).startOf('day')
  const jsDay = today.day()
  return today.subtract(jsDay === 0 ? 6 : jsDay - 1, 'day')
}

export function getWeekMondayInTimezone(timezone: string, ref?: Dayjs): Dayjs {
  const today = (ref ?? dayjs().tz(timezone)).startOf('day')
  const jsDay = today.day()
  return today.subtract(jsDay === 0 ? 6 : jsDay - 1, 'day')
}

function parseEndTimeOnDay(
  day: Dayjs,
  endTime: string,
  useUtc: boolean,
  timezone?: string,
): Dayjs {
  if (endTime === '24:00' || timeToMinutes(endTime) >= 24 * 60) {
    return useUtc ? day.utc().add(1, 'day').startOf('day') : day.tz(timezone!).add(1, 'day').startOf('day')
  }
  const fmt = 'YYYY-MM-DD HH:mm'
  const ymd = day.format('YYYY-MM-DD')
  return useUtc
    ? dayjs.utc(`${ymd} ${endTime}`, fmt)
    : dayjs.tz(`${ymd} ${endTime}`, fmt, timezone!)
}

function parseStartTimeOnDay(
  day: Dayjs,
  startTime: string,
  useUtc: boolean,
  timezone?: string,
): Dayjs {
  const fmt = 'YYYY-MM-DD HH:mm'
  const ymd = day.format('YYYY-MM-DD')
  return useUtc
    ? dayjs.utc(`${ymd} ${startTime}`, fmt)
    : dayjs.tz(`${ymd} ${startTime}`, fmt, timezone!)
}

function endTimeLabelForSegment(cursor: Dayjs, segEnd: Dayjs): string {
  const nextDayStart = cursor.startOf('day').add(1, 'day')
  if (segEnd.isSame(nextDayStart) || !segEnd.isBefore(nextDayStart)) {
    return '24:00'
  }
  return segEnd.format('HH:mm')
}

export function splitInstantRangeToWeeklySlots(
  rangeStart: Dayjs,
  rangeEnd: Dayjs,
  inUtc: boolean,
): WeeklyAvailabilitySlot[] {
  if (!rangeEnd.isAfter(rangeStart)) {
    return []
  }

  const segments: WeeklyAvailabilitySlot[] = []
  let cursor = rangeStart

  while (cursor.isBefore(rangeEnd)) {
    const dayEnd = cursor.startOf('day').add(1, 'day')
    const segEnd = rangeEnd.isBefore(dayEnd) ? rangeEnd : dayEnd
    const formatTime = (d: Dayjs) => (inUtc ? d.utc().format('HH:mm') : d.format('HH:mm'))

    segments.push({
      dayOfWeek: dbDayOfWeekFromDayjs(inUtc ? cursor.utc() : cursor),
      startTime: formatTime(cursor),
      endTime: endTimeLabelForSegment(cursor, segEnd),
      isActive: true,
    })
    cursor = segEnd
  }

  return segments
}

function splitInstantRangeToCalendar(start: Dayjs, end: Dayjs): CalendarAvailabilitySlot[] {
  if (!end.isAfter(start)) {
    return []
  }

  const out: CalendarAvailabilitySlot[] = []
  let cursor = start

  while (cursor.isBefore(end)) {
    const dayEnd = cursor.startOf('day').add(1, 'day')
    const segEnd = end.isBefore(dayEnd) ? end : dayEnd
    out.push({
      date: cursor.format('YYYY-MM-DD'),
      startTime: cursor.format('HH:mm'),
      endTime: endTimeLabelForSegment(cursor, segEnd),
    })
    cursor = segEnd
  }

  return out
}

export function mergeWeeklySlots(slots: WeeklyAvailabilitySlot[]): WeeklyAvailabilitySlot[] {
  const active = slots.filter((s) => s.isActive !== false)
  const byDay = new Map<number, WeeklyAvailabilitySlot[]>()

  for (const slot of active) {
    const list = byDay.get(slot.dayOfWeek) ?? []
    list.push({ ...slot, isActive: true })
    byDay.set(slot.dayOfWeek, list)
  }

  const merged: WeeklyAvailabilitySlot[] = []

  for (const day of [...byDay.keys()].sort((a, b) => a - b)) {
    const daySlots = (byDay.get(day) ?? []).sort(
      (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime),
    )

    let current: WeeklyAvailabilitySlot | null = null
    for (const slot of daySlots) {
      if (!current) {
        current = { ...slot }
        continue
      }
      if (timeToMinutes(current.endTime) === timeToMinutes(slot.startTime)) {
        current = { ...current, endTime: slot.endTime }
      } else {
        merged.push(current)
        current = { ...slot }
      }
    }
    if (current) {
      merged.push(current)
    }
  }

  return merged
}

/** Tutor local weekly pattern → UTC rows for `tutor_availability`. */
export function weeklySlotsInTimezoneToUtc(
  slots: WeeklyAvailabilitySlot[],
  sourceTimezone: string,
): WeeklyAvailabilitySlot[] {
  const monday = getWeekMondayInTimezone(sourceTimezone)
  const expanded: WeeklyAvailabilitySlot[] = []

  for (const slot of slots) {
    if (slot.isActive === false) {
      continue
    }

    const localDay = monday.add(slot.dayOfWeek, 'day')
    const start = parseStartTimeOnDay(localDay, slot.startTime, false, sourceTimezone)
    const end = parseEndTimeOnDay(localDay, slot.endTime, false, sourceTimezone)
    expanded.push(...splitInstantRangeToWeeklySlots(start.utc(), end.utc(), true))
  }

  return mergeWeeklySlots(expanded)
}

/** UTC weekly rows → tutor (or viewer) local weekly pattern for editing UI. */
export function utcWeeklySlotsToTimezone(
  slots: WeeklyAvailabilitySlot[],
  targetTimezone: string,
): WeeklyAvailabilitySlot[] {
  const monday = getWeekMondayUtc()
  const expanded: WeeklyAvailabilitySlot[] = []

  for (const slot of slots) {
    if (slot.isActive === false) {
      continue
    }

    const utcDay = monday.add(slot.dayOfWeek, 'day')
    const start = parseStartTimeOnDay(utcDay, slot.startTime, true)
    const end = parseEndTimeOnDay(utcDay, slot.endTime, true)
    expanded.push(
      ...splitInstantRangeToWeeklySlots(start.tz(targetTimezone), end.tz(targetTimezone), false),
    )
  }

  return mergeWeeklySlots(expanded)
}

/**
 * Expand UTC recurring slots into concrete calendar ranges for one week,
 * expressed in `targetTimezone` (for booking UIs).
 */
export function utcWeeklySlotsToCalendarInstances(
  slots: WeeklyAvailabilitySlot[],
  targetTimezone: string,
  weekOffset = 0,
): CalendarAvailabilitySlot[] {
  const utcMonday = getWeekMondayUtc().add(weekOffset * 7, 'day')
  const all: CalendarAvailabilitySlot[] = []

  for (const slot of slots) {
    if (slot.isActive === false) {
      continue
    }

    const utcDay = utcMonday.add(slot.dayOfWeek, 'day')
    const startUtc = parseStartTimeOnDay(utcDay, slot.startTime, true)
    const endUtc = parseEndTimeOnDay(utcDay, slot.endTime, true)
    const startLocal = startUtc.tz(targetTimezone)
    const endLocal = endUtc.tz(targetTimezone)
    all.push(...splitInstantRangeToCalendar(startLocal, endLocal))
  }

  return all
}

/** Match a booking instant against UTC availability windows. */
export function instantFitsUtcWeeklyAvailability(
  startAtIso: string,
  durationMinutes: number,
  availability: WeeklyAvailabilitySlot[],
): boolean {
  const start = dayjs(startAtIso).utc()
  const end = start.add(durationMinutes, 'minute')
  const monday = getWeekMondayUtc(start)

  return availability.some((slot) => {
    if (slot.isActive === false) {
      return false
    }
    const utcDay = monday.add(slot.dayOfWeek, 'day')
    const slotStart = parseStartTimeOnDay(utcDay, slot.startTime, true)
    const slotEnd = parseEndTimeOnDay(utcDay, slot.endTime, true)
    return !start.isBefore(slotStart) && !end.isAfter(slotEnd)
  })
}

/** Match tutor-local wall slot (subscription payload) against UTC availability. */
export function tutorLocalSlotFitsUtcAvailability(
  dateYmd: string,
  startTime: string,
  durationMinutes: number,
  tutorTimezone: string,
  availability: WeeklyAvailabilitySlot[],
): boolean {
  const start = dayjs.tz(`${dateYmd} ${startTime}`, 'YYYY-MM-DD HH:mm', tutorTimezone)
  return instantFitsUtcWeeklyAvailability(start.utc().toISOString(), durationMinutes, availability)
}

export function expandCalendarSlotToSteps(
  slot: CalendarAvailabilitySlot,
  stepMinutes: number,
  selectionDurationMinutes?: number,
): Array<{ date: string; startTime: string; endTime: string }> {
  const requiredEnd = selectionDurationMinutes ?? stepMinutes
  const startM = timeToMinutes(slot.startTime)
  const endM = timeToMinutes(slot.endTime)
  if (endM <= startM) {
    return []
  }

  const out: Array<{ date: string; startTime: string; endTime: string }> = []
  for (let m = startM; m + requiredEnd <= endM; m += stepMinutes) {
    const endStep = m + requiredEnd
    out.push({
      date: slot.date,
      startTime: minutesToTime(m),
      endTime: minutesToTime(endStep),
    })
  }
  return out
}
