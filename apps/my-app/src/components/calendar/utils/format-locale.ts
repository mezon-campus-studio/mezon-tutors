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

export function formatWeekDays(weekDays: CalendarWeekDay[], locale: string): CalendarWeekDay[] {
  return weekDays.map((day, index) => {
    let dayDate: dayjs.Dayjs;
    
    if (day.fullDate) {
      dayDate = dayjs(day.fullDate).locale(locale);
    } else {
      const now = dayjs();
      const dayOfWeek = now.day();
      const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const monday = now.subtract(mondayOffset, 'day');
      dayDate = monday.add(index, 'day').locale(locale);
    }
    
    return {
      shortLabel: dayDate.format('ddd').toUpperCase(),
      dateLabel: day.dateLabel,
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

export function formatTutorNextLessonLabel(nextLessonLabel: string, locale: string): string {
  const date = dayjs(nextLessonLabel, 'ddd, h:mm A', 'en', true);
  if (date.isValid()) {
    return date.locale(locale).format('ddd, h:mm A');
  }
  return nextLessonLabel;
}
