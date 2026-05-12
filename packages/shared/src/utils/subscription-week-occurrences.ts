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
