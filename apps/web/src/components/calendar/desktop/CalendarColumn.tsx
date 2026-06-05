'use client';

import { normalizeCalendarEventEndHour } from '@mezon-tutors/shared';
import { useMemo } from 'react';
import type { ReactNode } from 'react';
import type { CalendarType, CalendarEvent, CalendarRowModel, CalendarSlotState } from '../types';
import type { CalendarLayoutEngine } from '../utils/calendar-utils';

export type CalendarColumnConfig<TEvent> = {
  layoutEngine: CalendarLayoutEngine;
  rowHeight: number;
  slotPadding: number;
  eventPadding: number;
  eventTopPadding: number;
  readonly: boolean;
  isCompact: boolean;
  showNowLine?: boolean;
  currentHour?: number;
  headerHeight: number;
  weekendNoSlotDays?: number[];
  weekendNoSlotLabel?: string;
  emptySlotMergeHours?: number;
  onSlotClick?: (dayIndex: number, hour: number) => void;
  onEventClick?: (event: CalendarEvent<TEvent>, anchorRect: DOMRect) => void;
  renderEvent?: (event: CalendarEvent<TEvent>, isCompact: boolean) => ReactNode;
  renderSlot?: (dayIndex: number, hour: number, state?: CalendarSlotState) => ReactNode;
};

type CalendarColumnProps<TEvent> = {
  type: CalendarType;
  dayIndex: number;
  events: CalendarEvent<TEvent>[];
  rowModels: CalendarRowModel[];
  isLast: boolean;
  isActive: boolean;
  showGridLines: boolean;
  showTimelineGrid?: boolean;
  config: CalendarColumnConfig<TEvent>;
};

type ColumnEmptySlotProps<TEvent> = {
  row: Extract<CalendarRowModel, { type: 'hour' }>;
  dayIndex: number;
  config: CalendarColumnConfig<TEvent>;
  height?: number;
};

type ColumnEventSlotProps<TEvent> = {
  event: CalendarEvent<TEvent>;
  config: CalendarColumnConfig<TEvent>;
};

const getEventEndHour = (event: CalendarEvent<unknown>): number =>
  normalizeCalendarEventEndHour(
    event.startHour,
    event.endHour ?? event.startHour + 1,
  );

const EVENT_ANCHOR_SELECTOR = '[data-calendar-event-anchor]';

function getEventClickAnchorRect(target: HTMLElement): DOMRect {
  const inner = target.querySelector(EVENT_ANCHOR_SELECTOR);
  if (inner instanceof HTMLElement) return inner.getBoundingClientRect();
  return target.getBoundingClientRect();
}

function ColumnEmptySlot<TEvent>({ row, dayIndex, config, height }: ColumnEmptySlotProps<TEvent>) {
  const top = config.layoutEngine.getY(row.hour);
  const hasClick = !config.readonly && config.onSlotClick;

  return (
    <div
      className={`absolute w-full ${hasClick ? 'cursor-pointer' : 'cursor-default'}`}
      style={{
        top,
        height: height ?? config.rowHeight,
        padding: config.slotPadding,
      }}
      onClick={hasClick ? () => config.onSlotClick?.(dayIndex, row.hour) : undefined}
      onKeyDown={
        hasClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                config.onSlotClick?.(dayIndex, row.hour);
              }
            }
          : undefined
      }
      role={hasClick ? 'button' : undefined}
      tabIndex={hasClick ? 0 : undefined}
    >
      {config.renderSlot?.(dayIndex, row.hour)}
    </div>
  );
}

function ColumnEventSlot<TEvent>({ event, config }: ColumnEventSlotProps<TEvent>) {
  const top = config.layoutEngine.getY(event.startHour);
  const endHour = getEventEndHour(event);
  const bottom = config.layoutEngine.getY(endHour);
  const height = Math.max(0, bottom - top);
  const inset = height > 8 ? 1 : 0;
  const hasEventClick = Boolean(config.onEventClick);

  return (
    <div
      className={`absolute w-full z-10 overflow-hidden ${hasEventClick ? 'pointer-events-auto' : ''}`}
      style={{
        top: top + inset,
        height: Math.max(0, height - inset * 2),
        paddingLeft: config.eventPadding,
        paddingRight: config.eventPadding,
        paddingTop: config.eventTopPadding,
        paddingBottom: config.eventPadding,
      }}
    >
      {hasEventClick ? (
        <button
          type="button"
          className="flex h-full min-h-0 w-full cursor-pointer flex-col rounded-xl border-0 bg-transparent p-0 text-left outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-violet-400"
          onClick={(e) => {
            e.stopPropagation();
            config.onEventClick?.(event, getEventClickAnchorRect(e.currentTarget));
          }}
        >
          {config.renderEvent?.(event, config.isCompact)}
        </button>
      ) : (
        config.renderEvent?.(event, config.isCompact)
      )}
    </div>
  );
}

function WeekendNoSlotLabel({ type, label, headerHeight }: { type: CalendarType; label: string; headerHeight: number }) {
  return (
    <div
      className="absolute left-0 right-0 flex items-center justify-center pointer-events-none"
      style={{ top: headerHeight, bottom: 0 }}
    >
      <span
        className="text-[11px] font-bold opacity-45 uppercase tracking-wider"
        style={{
          color: `var(--calendar-${type}-day-label)`,
          transform: 'rotate(90deg)',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
    </div>
  );
}

export function CalendarColumn<TEvent = unknown>({
  type,
  dayIndex,
  events,
  rowModels,
  isLast,
  isActive,
  showGridLines,
  showTimelineGrid = true,
  config,
}: CalendarColumnProps<TEvent>) {
  const isWeekendNoSlotsColumn =
    events.length === 0 &&
    Boolean(config.weekendNoSlotLabel) &&
    config.weekendNoSlotDays?.includes(dayIndex);

  const mergeHours = Math.max(1, config.emptySlotMergeHours ?? 1);

  const hourRows = useMemo(
    () => rowModels.filter((row): row is Extract<CalendarRowModel, { type: 'hour' }> => row.type === 'hour'),
    [rowModels]
  );

  const rowHourSet = useMemo(() => new Set(hourRows.map((row) => row.hour)), [hourRows]);

  const occupiedHourSet = useMemo(() => {
    if (!events.length) return new Set<number>();
    
    const occupied = new Set<number>();
    for (const row of hourRows) {
      const hasOverlap = events.some(
        (event) => event.startHour < row.hour + 1 && getEventEndHour(event) > row.hour
      );
      if (hasOverlap) occupied.add(row.hour);
    }
    return occupied;
  }, [events, hourRows]);

  const borderColor = `var(--calendar-${type}-grid-border)`;
  const backgroundColor = isActive ? `var(--calendar-${type}-current-column)` : 'transparent';

  return (
    <div
      className={`
        flex-1 basis-0 min-w-0 relative
        ${showGridLines && !isLast ? 'border-r' : ''}
        ${showTimelineGrid ? 'border-t' : ''}
      `}
      style={{ backgroundColor, borderColor }}
    >
      {!isWeekendNoSlotsColumn &&
        rowModels.map((row) => {
          if (row.type === 'gap') return null;
          if (config.renderSlot && occupiedHourSet.has(row.hour)) return null;

          const isBlockStart = !config.renderSlot || !occupiedHourSet.has(row.hour - 1) || mergeHours === 1;
          if (!isBlockStart) return null;

          let span = 1;
          if (config.renderSlot && mergeHours > 1) {
            while (span < mergeHours) {
              const nextHour = row.hour + span;
              if (!rowHourSet.has(nextHour) || occupiedHourSet.has(nextHour)) break;
              span += 1;
            }
          }

          return (
            <ColumnEmptySlot
              key={`slot-${row.hour}`}
              row={row}
              dayIndex={dayIndex}
              config={config}
              height={config.rowHeight * span}
            />
          );
        })}

      {events.map((event) => (
        <ColumnEventSlot key={event.id} event={event} config={config} />
      ))}

      {isWeekendNoSlotsColumn && config.weekendNoSlotLabel && (
        <WeekendNoSlotLabel type={type} label={config.weekendNoSlotLabel} headerHeight={config.headerHeight} />
      )}

    </div>
  );
}
