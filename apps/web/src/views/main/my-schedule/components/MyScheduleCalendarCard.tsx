'use client';

import {
  CALENDAR_CONFIG,
  buildFallbackWeekDays,
  getFallbackWeekHours,
} from '@mezon-tutors/shared';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { CalendarCard, type CalendarEvent } from '@/components/calendar';
import MyScheduleEventCard from './MyScheduleEventCard';

type ScheduleEvent = {
  id: string;
  tutorId: string;
  studentId: string;
  studentMezonUserId: string | null;
  studentName: string;
  studentAvatarUrl?: string;
  startAt: string;
  durationMinutes: number;
  dayIndex: number;
  startHour: number;
  endHour: number;
  dateLabel: string;
  timeLabel: string;
  isCompleted: boolean;
};

type MyScheduleCalendarCardProps = {
  title: string;
  weekDays: { shortLabel: string; dateLabel: string }[];
  events: ScheduleEvent[];
  currentDayIndex?: number;
  currentHour?: number;
  isCurrentWeek?: boolean;
  onPrevWeek?: () => void;
  onNextWeek?: () => void;
  onGoToToday?: () => void;
  onSelectEvent?: (event: ScheduleEvent, anchorRect: DOMRect) => void;
};

export default function MyScheduleCalendarCard({
  title,
  weekDays,
  events,
  currentDayIndex,
  currentHour,
  isCurrentWeek,
  onPrevWeek,
  onNextWeek,
  onGoToToday,
  onSelectEvent,
}: MyScheduleCalendarCardProps) {
  const t = useTranslations('Dashboard.mySchedule');

  const calendarEvents: CalendarEvent<ScheduleEvent>[] = useMemo(
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

  const weekHours = useMemo(() => {
    const { MIN, MAX } = CALENDAR_CONFIG.DEFAULT_VISIBLE_RANGE;
    const defaultHours = Array.from(
      { length: MAX - MIN + 1 },
      (_, i) => MIN + i,
    );
    const hourSet = new Set<number>(defaultHours);
    for (const event of events) {
      const start = Math.floor(event.startHour);
      const end = Math.ceil(event.endHour);
      for (let h = start; h <= end; h++) hourSet.add(h);
    }
    if (currentHour !== undefined) {
      hourSet.add(Math.floor(currentHour));
    }
    return Array.from(hourSet).sort((a, b) => a - b);
  }, [events, currentHour]);

  const finalWeekDays = weekDays.length ? weekDays : buildFallbackWeekDays();
  const finalWeekHours = weekHours.length ? weekHours : getFallbackWeekHours();

  const customHeader = (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-1">
      <div className="flex items-center gap-3">
        <h2
          className="text-2xl font-extrabold tracking-tight md:text-3xl"
          style={{
            background:
              'linear-gradient(110deg,#7c3aed 0%,#a855f7 50%,#ec4899 100%)',
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
            aria-label="Previous week"
            className="flex size-8 items-center justify-center rounded-full border border-violet-200 bg-white text-violet-700 transition hover:border-violet-300 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40"
            onClick={onPrevWeek}
            disabled={!onPrevWeek}
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Next week"
            className="flex size-8 items-center justify-center rounded-full border border-violet-200 bg-white text-violet-700 transition hover:border-violet-300 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40"
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
          className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
            isCurrentWeek
              ? 'cursor-not-allowed border-slate-200 text-slate-400'
              : 'cursor-pointer border-violet-200 text-violet-700 hover:border-violet-300 hover:bg-violet-50'
          }`}
          onClick={isCurrentWeek ? undefined : onGoToToday}
          disabled={isCurrentWeek}
        >
          {t('calendar.today')}
        </button>
        <span className="rounded-full bg-[linear-gradient(110deg,#7c3aed_0%,#9333ea_50%,#db2777_100%)] px-3.5 py-1.5 text-xs font-bold text-white shadow-sm shadow-violet-300/40">
          {t('calendar.week')}
        </span>
      </div>
    </div>
  );

  return (
    <div className="overflow-hidden rounded-3xl border border-violet-100 bg-white p-3 shadow-sm shadow-violet-100/40 sm:p-5">
      <CalendarCard
        type="mySchedule"
        weekDays={finalWeekDays}
        weekHours={finalWeekHours}
        events={calendarEvents}
        currentDayIndex={currentDayIndex}
        currentHour={currentHour}
        enableGapCollapse
        readonly
        onEventClick={onSelectEvent ? (ev, rect) => onSelectEvent(ev.data, rect) : undefined}
        renderEvent={(event) => <MyScheduleEventCard event={event.data} />}
        header={customHeader}
      />
    </div>
  );
}
