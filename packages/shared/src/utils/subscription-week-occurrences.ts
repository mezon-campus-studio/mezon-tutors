import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import { DEFAULT_TIMEZONE } from '../constants/my-schedule'

dayjs.extend(utc)
dayjs.extend(timezone)

export type SubscriptionWeeklySlotLike = {
  dayOfWeek: number
  startTime: string
  durationMinutes: number
  date?: string
}

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/

function subscriptionSlotConcreteStart(slot: SubscriptionWeeklySlotLike, tz: string) {
  const [hp, mp] = slot.startTime.split(':')
  const h = Number.parseInt(hp ?? '0', 10)
  const m = Number.parseInt(mp ?? '0', 10)
  const d = (slot.date ?? '').trim()
  return dayjs.tz(d, tz).startOf('day').hour(h).minute(m).second(0).millisecond(0)
}

export function subscriptionSlotsUseConcreteDates(slots: SubscriptionWeeklySlotLike[]): boolean {
  return (
    slots.length > 0 &&
    slots.every((s) => typeof s.date === 'string' && YMD_RE.test((s.date ?? '').trim()))
  )
}

export function buildMonthlySubscriptionSlotJson(
  weeklyAnchors: { date: string }[],
  normalized: SubscriptionWeeklySlotLike[],
  monthlyWeeks: number,
  tz: string
): SubscriptionWeeklySlotLike[] {
  const out: SubscriptionWeeklySlotLike[] = []
  for (let w = 0; w < monthlyWeeks; w += 1) {
    for (let i = 0; i < normalized.length; i += 1) {
      const anchor = (weeklyAnchors[i]?.date ?? '').trim()
      const slotDate = dayjs.tz(anchor, tz).startOf('day').add(w, 'week').format('YYYY-MM-DD')
      const base = normalized[i]
      if (!base) {
        continue
      }
      out.push({
        dayOfWeek: base.dayOfWeek,
        startTime: base.startTime,
        durationMinutes: base.durationMinutes,
        date: slotDate,
      })
    }
  }
  out.sort(
    (a, b) =>
      subscriptionSlotConcreteStart(a, tz).valueOf() - subscriptionSlotConcreteStart(b, tz).valueOf()
  )
  return out
}

export function subscriptionConcreteOccurrencesSorted(
  slots: SubscriptionWeeklySlotLike[],
  tz: string
): { startAt: Date; endAt: Date; slotIndex: number }[] {
  if (!subscriptionSlotsUseConcreteDates(slots)) {
    return []
  }
  const out: { startAt: Date; endAt: Date; slotIndex: number }[] = []
  slots.forEach((slot, slotIndex) => {
    const start = subscriptionSlotConcreteStart(slot, tz)
    out.push({
      startAt: start.toDate(),
      endAt: start.add(slot.durationMinutes, 'minute').toDate(),
      slotIndex,
    })
  })
  return out.sort((a, b) => a.startAt.getTime() - b.startAt.getTime())
}

export function subscriptionSlotsOccurrencesForWeek(
  weekStartYmd: string,
  slots: SubscriptionWeeklySlotLike[],
  tz = DEFAULT_TIMEZONE
): { startAt: Date; endAt: Date; slotIndex: number }[] {
  const weekStart = dayjs.tz(weekStartYmd, tz).startOf('day')
  const weekEnd = weekStart.add(7, 'day')
  const out: { startAt: Date; endAt: Date; slotIndex: number }[] = []

  if (subscriptionSlotsUseConcreteDates(slots)) {
    slots.forEach((slot, slotIndex) => {
      const start = subscriptionSlotConcreteStart(slot, tz)
      if (!start.isBefore(weekStart) && start.isBefore(weekEnd)) {
        out.push({
          startAt: start.toDate(),
          endAt: start.add(slot.durationMinutes, 'minute').toDate(),
          slotIndex,
        })
      }
    })
  } else {
    const occ = subscriptionWeeklySlotsToOccurrencesInTimezone(weekStartYmd, slots, tz)
    occ.forEach((range, slotIndex) => {
      const s = dayjs(range.startAt).tz(tz)
      if (!s.isBefore(weekStart) && s.isBefore(weekEnd)) {
        out.push({ startAt: range.startAt, endAt: range.endAt, slotIndex })
      }
    })
  }

  return out.sort((a, b) => a.startAt.getTime() - b.startAt.getTime())
}

export function subscriptionWeeklySlotsToOccurrencesInTimezone(
  weekStartYmd: string,
  slots: SubscriptionWeeklySlotLike[],
  tz = DEFAULT_TIMEZONE
): { startAt: Date; endAt: Date }[] {
  const monday = dayjs.tz(weekStartYmd, tz).startOf('day')
  const out: { startAt: Date; endAt: Date }[] = []
  for (const s of slots) {
    const day = monday.add(s.dayOfWeek, 'day')
    const [hp, mp] = s.startTime.split(':')
    const h = Number.parseInt(hp ?? '0', 10)
    const m = Number.parseInt(mp ?? '0', 10)
    const start = day.hour(h).minute(m).second(0).millisecond(0)
    const end = start.add(s.durationMinutes, 'minute')
    out.push({ startAt: start.toDate(), endAt: end.toDate() })
  }
  return out
}
