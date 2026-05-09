import type { CalendarType, CalendarWeekDay } from '../types';

type CalendarDayHeaderProps = {
  type: CalendarType;
  day: CalendarWeekDay;
  isActive: boolean;
  isLast: boolean;
  showGridLines: boolean;
};

export function CalendarDayHeader({
  type,
  day,
  isActive,
  isLast,
  showGridLines,
}: CalendarDayHeaderProps) {
  return (
    <div
      className={`
        flex-1 basis-0 min-w-0 flex flex-col items-center justify-center gap-1 py-3
        ${isActive && !showGridLines ? 'rounded-lg border' : ''}
        ${showGridLines && !isLast ? 'border-r' : ''}
      `}
      style={{
        backgroundColor: isActive ? `var(--calendar-${type}-active-day-column)` : 'transparent',
        borderColor: `var(--calendar-${type}-grid-border)`,
      }}
    >
      <span
        className="text-xs uppercase tracking-wider font-semibold"
        style={{
          color: `var(--calendar-${type}-day-label)`,
        }}
      >
        {day.shortLabel}
      </span>
      <span
        className="text-lg font-bold leading-5"
        style={{
          color: isActive ? `var(--calendar-${type}-active-date)` : `var(--calendar-${type}-inactive-date)`,
        }}
      >
        {day.dateLabel}
      </span>
    </div>
  );
}
