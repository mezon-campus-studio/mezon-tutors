import { EPeriod } from '../enums/date-time'
import type { TutorDetailAvailabilitySlotDto } from '../types/tutor-profile'
import { timeToMinutes, minutesToTime, parseTimeParts } from './date-time'

export type TrialTimeSlot = {
  id: string
  label: string
  period: EPeriod
  startTime: string
}

export function jsDayToDbDayOfWeek(jsDay: number): number {
  return (jsDay + 6) % 7
}

function expandRangeToSteps(start: string, end: string, stepMinutes: number): string[] {
  const startM = timeToMinutes(start)
  const endM = timeToMinutes(end)
  if (endM <= startM) return []

  const out: string[] = []
  for (let m = startM; m + stepMinutes <= endM; m += stepMinutes) {
    out.push(minutesToTime(m))
  }
  return out
}

function formatTimeLabel(hhmm: string): string {
  const { hour, minute } = parseTimeParts(hhmm)
  const d = new Date()
  d.setHours(hour, minute, 0, 0)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function periodFromHourMinute(hour: number): EPeriod {
  if (hour >= 1 && hour < 11) return EPeriod.MORNING
  if (hour >= 11 && hour < 13) return EPeriod.NOON
  if (hour >= 13 && hour < 17) return EPeriod.AFTERNOON
  return EPeriod.EVENING
}

export function buildTimeSlotsForDay(
  slots: TutorDetailAvailabilitySlotDto[],
  dbDayOfWeek: number,
  stepMinutes = 30,
  selectionDurationMinutes?: number,
): TrialTimeSlot[] {
  const seen: Record<string, true> = {}
  const result: TrialTimeSlot[] = []

  for (const slot of slots) {
    if (!slot.isActive || slot.dayOfWeek !== dbDayOfWeek) continue

    const starts = expandRangeToSteps(slot.startTime, slot.endTime, stepMinutes)
    const requiredEnd = selectionDurationMinutes ?? stepMinutes
    for (const start of starts) {
      const startM = timeToMinutes(start)
      if (startM + requiredEnd > timeToMinutes(slot.endTime)) {
        continue
      }
      if (seen[start]) continue
      seen[start] = true
      const { hour } = parseTimeParts(start)
      result.push({
        id: start,
        label: formatTimeLabel(start),
        period: periodFromHourMinute(hour),
        startTime: start,
      })
    }
  }

  result.sort((a, b) => a.startTime.localeCompare(b.startTime))
  return result
}
