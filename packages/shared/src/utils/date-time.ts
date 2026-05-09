import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

export function formatDateDMY(isoDateString: string): string {
  return dayjs(isoDateString).format('DD/MM/YYYY')
}

export function formatDate(isoDateString: string, format = 'DD/MM/YYYY'): string {
  return dayjs(isoDateString).format(format)
}

export function parseTimeParts(str: string): { hour: number; minute: number } {
  const parts = str.trim().split(':').map((p) => Number.parseInt(p, 10))
  return { hour: parts[0] ?? 0, minute: parts[1] ?? 0 }
}

export function timeToMinutes(str: string): number {
  const { hour, minute } = parseTimeParts(str)
  return hour * 60 + minute
}

export function minutesToTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function parseYyyyMmDdToLocalDate(input: string): Date {
  const parts = input.split('-').map((p) => Number.parseInt(p, 10))
  const y = parts[0] ?? 1970
  const m = parts[1] ?? 1
  const d = parts[2] ?? 1
  return new Date(y, m - 1, d)
}

export function utcDateToHHmm(input: Date): string {
  const h = String(input.getUTCHours()).padStart(2, '0')
  const m = String(input.getUTCMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

export function utcDateToMinutes(input: Date): number {
  return input.getUTCHours() * 60 + input.getUTCMinutes()
}

export function formatWeekday(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: 'short' })
    .format(date)
    .toUpperCase()
}

export function formatWeekRange(weekDates: Date[], locale: string): string {
  if (!weekDates.length) return ''
  
  const formatter = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  
  return `${formatter.format(weekDates[0])} - ${formatter.format(weekDates[weekDates.length - 1])}`
}

export function formatTimezoneToUTC(tz: string): string {
  try {
    const offset = dayjs().tz(tz).utcOffset()
    const hours = Math.floor(Math.abs(offset) / 60)
    const minutes = Math.abs(offset) % 60
    const sign = offset >= 0 ? '+' : '-'
    
    return minutes > 0 
      ? `UTC${sign}${hours}:${String(minutes).padStart(2, '0')}`
      : `UTC${sign}${hours}`
  } catch {
    return tz
  }
}

export function getWeekStartMonday(now = new Date()): Date {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const jsDay = today.getDay()
  const distanceToMonday = jsDay === 0 ? 6 : jsDay - 1
  const monday = new Date(today)
  monday.setDate(today.getDate() - distanceToMonday)
  return monday
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

export function formatYmd(date: Date): string {
  const pad2 = (num: number) => String(num).padStart(2, '0')
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

export function formatHour24(hour: number): string {
  if (hour === 24) return '24:00';
  return dayjs().hour(Math.floor(hour)).minute(Math.round((hour % 1) * 60)).format('HH:mm');
}