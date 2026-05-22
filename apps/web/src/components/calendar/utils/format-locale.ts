import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import 'dayjs/locale/vi';
import 'dayjs/locale/en';
import type { CalendarWeekDay } from '../types';

import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(utc);
dayjs.extend(customParseFormat);

export function formatCalendarTitle(title: string, locale: string): string {
  const date = dayjs.utc(title, 'MMMM YYYY', true).locale(locale);
  return date.isValid() ? date.format('MMMM YYYY') : title;
}

export function formatWeekDays(
  weekDays: CalendarWeekDay[],
  locale: string,
  timezoneName?: string,
): CalendarWeekDay[] {
  return weekDays.map((day) => {
    if (!day.fullDate) {
      return {
        shortLabel: day.shortLabel,
        dateLabel: day.dateLabel,
        fullDate: day.fullDate,
      };
    }

    const dayDate = (timezoneName
      ? dayjs(day.fullDate).tz(timezoneName)
      : dayjs(day.fullDate)
    ).locale(locale);

    return {
      shortLabel: dayDate.format('ddd').toUpperCase(),
      dateLabel: dayDate.format('DD'),
      fullDate: day.fullDate,
    };
  });
}

export function formatLessonDateLabel(dateLabel: string, locale: string): string {
  const date = dayjs(dateLabel, 'ddd, MMM DD', 'en', true);
  if (date.isValid()) {
    const formatStr = locale === 'vi' ? 'ddd, DD MMM' : 'ddd, MMM DD';
    return date.locale(locale).format(formatStr);
  }
  return dateLabel;
}

export function formatTutorNextLessonLabel(
  nextLessonLabel: string,
  locale: string,
  timezoneName?: string,
  nextLessonAtIso?: string | null,
): string {
  if (nextLessonAtIso && timezoneName) {
    const instant = dayjs(nextLessonAtIso);
    if (instant.isValid()) {
      return instant.tz(timezoneName).locale(locale).format('ddd, h:mm A');
    }
  }

  const date = dayjs(nextLessonLabel, 'ddd, h:mm A', 'en', true);
  if (date.isValid()) {
    return date.locale(locale).format('ddd, h:mm A');
  }
  return nextLessonLabel;
}
