'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { CalendarCard, type CalendarEvent } from '@/components/calendar';
import { useCalendarNow, useIsBelowLaptop, useBreakpoint } from '@/hooks';
import type { CalendarType } from '@/components/calendar/types';
import {
  addCalendarEventHourTicks,
  buildFallbackWeekDays,
  CALENDAR_CONFIG,
  filterCalendarWeekHourTicks,
  getFallbackWeekHours,
} from '@mezon-tutors/shared';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import DashboardScheduleMobileList from './DashboardScheduleMobileList';
import type {
  DashboardScheduleCalendarEvent,
  DashboardScheduleCalendarLabels,
  DashboardScheduleWeekDay,
} from './types';

export type { DashboardScheduleWeekDay, DashboardScheduleCalendarEvent, DashboardScheduleCalendarLabels };

export type DashboardScheduleCalendarProps<T extends DashboardScheduleCalendarEvent> = {
  title: string;
  weekDays: DashboardScheduleWeekDay[];
  events: T[];
  currentDayIndex?: number;
  currentHour?: number;
  isCurrentWeek?: boolean;
  onPrevWeek?: () => void;
  onNextWeek?: () => void;
  onGoToToday?: () => void;
  labels: DashboardScheduleCalendarLabels;
  renderEvent: (event: T, layout?: 'grid' | 'list') => ReactNode;
  onEventClick?: (event: T, anchorRect: DOMRect) => void;
  calendarType?: CalendarType;
  timezoneName?: string;
  weekStartYmd?: string;
};

export function buildDashboardScheduleWeekHours(
  events: Pick<DashboardScheduleCalendarEvent, 'startHour' | 'endHour'>[],
  currentHour?: number,
): number[] {
  const { MIN, MAX } = CALENDAR_CONFIG.DEFAULT_VISIBLE_RANGE;
  const defaultHours = Array.from({ length: MAX - MIN + 1 }, (_, i) => MIN + i);
  const hourSet = new Set<number>(defaultHours);
  for (const event of events) {
    addCalendarEventHourTicks(hourSet, event.startHour, event.endHour);
  }
  if (currentHour !== undefined) {
    hourSet.add(Math.min(CALENDAR_CONFIG.DEFAULT_VISIBLE_RANGE.MAX, Math.floor(currentHour)));
  }
  return filterCalendarWeekHourTicks(Array.from(hourSet)).sort((a, b) => a - b);
}

export function DashboardScheduleCalendar<T extends DashboardScheduleCalendarEvent>({
  title,
  weekDays,
  events,
  currentDayIndex,
  currentHour,
  isCurrentWeek,
  onPrevWeek,
  onNextWeek,
  onGoToToday,
  labels,
  renderEvent,
  onEventClick,
  calendarType = 'mySchedule',
  timezoneName,
  weekStartYmd,
}: DashboardScheduleCalendarProps<T>) {
  const prevAria = labels.prevWeekAria ?? 'Previous week';
  const nextAria = labels.nextWeekAria ?? 'Next week';
  const emptyDayMessage = labels.emptyDay ?? 'No lessons scheduled for this day';
  const isBelowLaptop = useIsBelowLaptop();
  const breakpoint = useBreakpoint();
  const isCompactGrid = breakpoint === 'laptop';

  const liveNow = useCalendarNow(
    timezoneName ?? '',
    weekStartYmd,
    Boolean(isCurrentWeek && timezoneName && weekStartYmd),
  );

  const resolvedDayIndex = isCurrentWeek
    ? (liveNow.currentDayIndex ?? currentDayIndex)
    : currentDayIndex;
  const resolvedHour = isCurrentWeek
    ? (liveNow.currentHour ?? currentHour)
    : currentHour;

  const [selectedDayIndex, setSelectedDayIndex] = useState(
    resolvedDayIndex ?? 0,
  );

  useEffect(() => {
    if (isCurrentWeek && resolvedDayIndex !== undefined) {
      setSelectedDayIndex(resolvedDayIndex);
      return;
    }
    setSelectedDayIndex(0);
  }, [weekStartYmd, isCurrentWeek, resolvedDayIndex]);

  const isViewingToday =
    isCurrentWeek &&
    resolvedDayIndex !== undefined &&
    selectedDayIndex === resolvedDayIndex;

  const isTodayDisabled = isBelowLaptop ? isViewingToday : Boolean(isCurrentWeek);

  const handleGoToToday = () => {
    onGoToToday?.();
    if (resolvedDayIndex !== undefined) {
      setSelectedDayIndex(resolvedDayIndex);
    }
  };

  const calendarEvents: CalendarEvent<T>[] = useMemo(
    () =>
      events.map((event) => ({
        id: event.id,
        dayIndex: event.dayIndex,
        startHour: event.startHour,
        endHour: event.endHour,
        data: event,
      })),
    [events],
  );

  const weekHours = useMemo(
    () => buildDashboardScheduleWeekHours(events, resolvedHour),
    [events, resolvedHour],
  );

  const finalWeekDays = weekDays.length ? weekDays : buildFallbackWeekDays();
  const finalWeekHours = weekHours.length ? weekHours : getFallbackWeekHours();

  const header = (
    <div className="mb-3 flex flex-col gap-3 px-1 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center justify-between gap-3 sm:justify-start">
        <h2
          className="text-xl font-extrabold tracking-tight sm:text-2xl lg:text-3xl"
          style={{
            background: 'linear-gradient(110deg,#7c3aed 0%,#a855f7 50%,#ec4899 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {title}
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={prevAria}
            className="flex size-11 items-center justify-center rounded-full border border-violet-200 bg-white text-violet-700 transition hover:border-violet-300 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40 sm:size-9"
            onClick={onPrevWeek}
            disabled={!onPrevWeek}
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            aria-label={nextAria}
            className="flex size-11 items-center justify-center rounded-full border border-violet-200 bg-white text-violet-700 transition hover:border-violet-300 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40 sm:size-9"
            onClick={onNextWeek}
            disabled={!onNextWeek}
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className={`min-h-11 rounded-full border px-4 py-2 text-xs font-semibold transition-colors sm:min-h-0 sm:px-3.5 sm:py-1.5 ${
            isTodayDisabled
              ? 'cursor-not-allowed border-slate-200 text-slate-400'
              : 'cursor-pointer border-violet-200 text-violet-700 hover:border-violet-300 hover:bg-violet-50'
          }`}
          onClick={isTodayDisabled ? undefined : handleGoToToday}
          disabled={isTodayDisabled}
        >
          {labels.today}
        </button>
        <span className="inline-flex min-h-11 items-center rounded-full bg-[linear-gradient(110deg,#7c3aed_0%,#9333ea_50%,#db2777_100%)] px-4 py-2 text-xs font-bold text-white shadow-sm shadow-violet-300/40 sm:min-h-0 sm:px-3.5 sm:py-1.5">
          {labels.weekBadge}
        </span>
      </div>
    </div>
  );

  return (
    <div className="overflow-hidden rounded-3xl border border-violet-100 bg-white p-3 shadow-sm shadow-violet-100/40 sm:p-4 lg:p-5">
      {header}

      {isBelowLaptop ? (
        <DashboardScheduleMobileList
          weekDays={finalWeekDays}
          events={events}
          selectedDayIndex={selectedDayIndex}
          onSelectDay={setSelectedDayIndex}
          currentDayIndex={resolvedDayIndex}
          emptyMessage={emptyDayMessage}
          renderEvent={renderEvent}
          onEventClick={onEventClick}
        />
      ) : (
        <CalendarCard<T>
          type={calendarType}
          weekDays={finalWeekDays}
          weekHours={finalWeekHours}
          events={calendarEvents}
          currentDayIndex={resolvedDayIndex}
          currentHour={resolvedHour}
          enableGapCollapse
          readonly
          isCompact={isCompactGrid}
          onEventClick={onEventClick ? (ev, rect) => onEventClick(ev.data, rect) : undefined}
          renderEvent={(ev, _isCompact) => renderEvent(ev.data, 'grid')}
        />
      )}
    </div>
  );
}
