'use client';

import { useMemo, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type {
  DashboardScheduleCalendarEvent,
  DashboardScheduleWeekDay,
} from "./types";

type DashboardScheduleMobileListProps<T extends DashboardScheduleCalendarEvent> = {
  weekDays: DashboardScheduleWeekDay[];
  events: T[];
  selectedDayIndex: number;
  onSelectDay: (dayIndex: number) => void;
  currentDayIndex?: number;
  emptyMessage: string;
  renderEvent: (event: T, layout?: 'grid' | 'list') => ReactNode;
  onEventClick?: (event: T, anchorRect: DOMRect) => void;
};

export default function DashboardScheduleMobileList<
  T extends DashboardScheduleCalendarEvent,
>({
  weekDays,
  events,
  selectedDayIndex,
  onSelectDay,
  currentDayIndex,
  emptyMessage,
  renderEvent,
  onEventClick,
}: DashboardScheduleMobileListProps<T>) {
  const cardRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const dayEvents = useMemo(
    () =>
      events
        .filter((event) => event.dayIndex === selectedDayIndex)
        .sort((a, b) => a.startHour - b.startHour),
    [events, selectedDayIndex],
  );

  const eventCountsByDay = useMemo(() => {
    const counts = Array.from({ length: weekDays.length }, () => 0);
    for (const event of events) {
      if (event.dayIndex >= 0 && event.dayIndex < counts.length) {
        counts[event.dayIndex] += 1;
      }
    }
    return counts;
  }, [events, weekDays.length]);

  const handleEventClick = (event: T) => {
    if (!onEventClick) return;
    const el = cardRefs.current.get(event.id);
    onEventClick(event, el?.getBoundingClientRect() ?? new DOMRect());
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((day, index) => {
          const isActive = selectedDayIndex === index;
          const isToday = currentDayIndex === index;
          const eventCount = eventCountsByDay[index] ?? 0;

          return (
            <button
              key={`${day.shortLabel}-${day.dateLabel}-${index}`}
              type="button"
              onClick={() => onSelectDay(index)}
              className={cn(
                'relative flex min-h-14 flex-col items-center justify-center rounded-2xl px-1 pb-2 pt-4 transition-colors',
                isActive
                  ? 'bg-[linear-gradient(110deg,#7c3aed_0%,#9333ea_50%,#db2777_100%)] text-white shadow-sm shadow-violet-300/40'
                  : isToday
                    ? 'border border-violet-200 bg-violet-50/50 text-violet-700'
                    : 'text-slate-600 hover:bg-violet-50',
                eventCount > 0 ? 'border border-violet-200' : null,
              )}
            >
              {eventCount > 0 ? (
                <span
                  className={cn(
                    "absolute right-1 top-1 inline-flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-extrabold leading-4 shadow-sm bg-red-500 text-white",
                  )}
                >
                  {eventCount}
                </span>
              ) : null}
              <span
                className={cn(
                  'text-[9px] font-bold uppercase leading-none tracking-wide sm:text-[10px]',
                  isActive ? 'text-white/90' : isToday ? 'text-violet-600' : 'text-slate-500',
                )}
              >
                {day.shortLabel}
              </span>
              <span className="mt-0.5 text-sm font-extrabold leading-none sm:text-base">
                {day.dateLabel}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-2.5">
        {dayEvents.length > 0 ? (
          dayEvents.map((event) => (
            <button
              key={event.id}
              ref={(el) => {
                if (el) {
                  cardRefs.current.set(event.id, el);
                } else {
                  cardRefs.current.delete(event.id);
                }
              }}
              type="button"
              onClick={() => handleEventClick(event)}
              className="min-h-11 w-full overflow-hidden rounded-2xl border-0 bg-transparent p-0 text-left transition-all hover:shadow-md hover:shadow-violet-100/40 active:scale-[0.99]"
            >
              <div className="pointer-events-none w-full">
                {renderEvent(event, 'list')}
              </div>
            </button>
          ))
        ) : (
          <div className="flex min-h-[120px] items-center justify-center rounded-2xl border border-dashed border-violet-200 bg-violet-50/30 px-4 py-8 text-center">
            <p className="text-sm text-slate-500">{emptyMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
}
