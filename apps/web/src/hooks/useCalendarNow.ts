'use client';

import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { useEffect, useMemo, useState } from 'react';
import { parseYmdInTimezone } from '@/lib/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

export type CalendarNowMarkers = {
  currentDayIndex?: number;
  currentHour?: number;
};

export function getCalendarNowMarkers(
  timezoneName: string,
  weekStartYmd: string,
  enabled: boolean,
): CalendarNowMarkers {
  if (!enabled || !weekStartYmd.trim()) {
    return {};
  }

  const monday = parseYmdInTimezone(weekStartYmd, timezoneName).startOf('day');
  const weekEnd = monday.add(7, 'day');
  const now = dayjs().tz(timezoneName);

  if (now.isBefore(monday) || !now.isBefore(weekEnd)) {
    return {};
  }

  const dayIndex = now.startOf('day').diff(monday, 'day');

  return {
    currentDayIndex: Math.max(0, Math.min(6, dayIndex)),
    currentHour: now.hour() + now.minute() / 60,
  };
}

export function useCalendarNow(
  timezoneName: string,
  weekStartYmd: string | undefined,
  enabled: boolean,
): CalendarNowMarkers {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!enabled || !weekStartYmd) return;
    const id = window.setInterval(() => setTick((value) => value + 1), 60_000);
    return () => window.clearInterval(id);
  }, [enabled, weekStartYmd]);

  return useMemo(
    () =>
      weekStartYmd
        ? getCalendarNowMarkers(timezoneName, weekStartYmd, enabled)
        : {},
    [timezoneName, weekStartYmd, enabled, tick],
  );
}
