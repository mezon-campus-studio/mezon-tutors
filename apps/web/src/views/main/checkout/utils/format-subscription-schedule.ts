import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { DEFAULT_TIMEZONE, type SubscriptionWeeklySlotDto } from '@mezon-tutors/shared';

dayjs.extend(utc);
dayjs.extend(timezone);

export type MergedSubscriptionScheduleGroup = {
  daysLine: string;
  rangeLine: string;
  sortKey: number;
  durationMinutes: number;
};

function formatTimeRange(
  start: dayjs.Dayjs,
  end: dayjs.Dayjs,
  locale: string,
  displayTimezone: string,
): string {
  const fmt = new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: displayTimezone,
  });
  return `${fmt.format(start.toDate())} – ${fmt.format(end.toDate())}`;
}

function slotDisplayWeekday(
  slot: SubscriptionWeeklySlotDto,
  locale: string,
  displayTimezone: string,
): { weekday: string; start: dayjs.Dayjs; end: dayjs.Dayjs; sortKey: number } {
  const refMonday = dayjs.tz('2024-01-01', 'YYYY-MM-DD', DEFAULT_TIMEZONE);
  const slotDate = refMonday.add(slot.dayOfWeek, 'day');
  const start = dayjs.tz(
    `${slotDate.format('YYYY-MM-DD')} ${slot.startTime}`,
    'YYYY-MM-DD HH:mm',
    DEFAULT_TIMEZONE,
  );
  const end = start.add(slot.durationMinutes, 'minute');
  const startLocal = start.tz(displayTimezone);
  const endLocal = end.tz(displayTimezone);
  const weekday = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    timeZone: displayTimezone,
  }).format(startLocal.toDate());

  return {
    weekday,
    start: startLocal,
    end: endLocal,
    sortKey: startLocal.day() * 1440 + startLocal.hour() * 60 + startLocal.minute(),
  };
}

export function mergeSubscriptionWeeklySlots(
  slots: SubscriptionWeeklySlotDto[],
  locale: string,
  displayTimezone: string,
): MergedSubscriptionScheduleGroup[] {
  const groups = new Map<
    string,
    {
      entries: { weekday: string; sortKey: number }[];
      rangeLine: string;
      sortKey: number;
      durationMinutes: number;
    }
  >();

  for (const slot of slots) {
    const { weekday, start, end, sortKey } = slotDisplayWeekday(slot, locale, displayTimezone);
    const rangeLine = formatTimeRange(start, end, locale, displayTimezone);
    const key = `${rangeLine}|${slot.durationMinutes}`;
    const existing = groups.get(key);

    if (existing) {
      if (!existing.entries.some((entry) => entry.weekday === weekday)) {
        existing.entries.push({ weekday, sortKey });
      }
      existing.sortKey = Math.min(existing.sortKey, sortKey);
      continue;
    }

    groups.set(key, {
      entries: [{ weekday, sortKey }],
      rangeLine,
      sortKey,
      durationMinutes: slot.durationMinutes,
    });
  }

  const listFormatter = new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' });

  return [...groups.values()]
    .map((group) => {
      const sortedWeekdays = [...group.entries]
        .sort((a, b) => a.sortKey - b.sortKey)
        .map((entry) => entry.weekday);
      return {
        daysLine: listFormatter.format(sortedWeekdays),
        rangeLine: group.rangeLine,
        sortKey: group.sortKey,
        durationMinutes: group.durationMinutes,
      };
    })
    .sort((a, b) => a.sortKey - b.sortKey);
}
