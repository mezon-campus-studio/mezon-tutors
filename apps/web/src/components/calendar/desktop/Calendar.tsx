'use client';

import { CALENDAR_CONFIG, CALENDAR_THEME_CONFIG, DEFAULT_THEME_CONFIG, formatHour24 } from '@mezon-tutors/shared';
import dayjs from 'dayjs';
import { useMemo } from 'react';
import type { BaseCalendarProps, CalendarEvent } from '../types';
import { CalendarColumn, type CalendarColumnConfig } from './CalendarColumn';
import { CalendarDayHeader } from './CalendarDayHeader';
import { CalendarGridLayer } from './CalendarGridLayer';
import { buildRowModels, CalendarLayoutEngine } from '../utils/calendar-utils';

const formatRangeLabel = (startHour: number, endHour: number): string => 
  `${formatHour24(startHour)} - ${formatHour24(endHour)}`;

const getCompactValue = <T,>(isCompact: boolean, compactValue: T, normalValue: T): T =>
  isCompact ? compactValue : normalValue;

export function Calendar<TEvent = unknown>({
  type,
  weekDays,
  weekHours,
  events = [],
  currentDayIndex,
  currentHour,
  enableGapCollapse = false,
  minGapHours = CALENDAR_CONFIG.MIN_GAP_HOURS,
  readonly = false,
  onSlotClick,
  onEventClick,
  renderEvent,
  renderSlot,
  isCompact = false,
}: BaseCalendarProps<TEvent>) {
  const themeConfig = CALENDAR_THEME_CONFIG[type] ?? DEFAULT_THEME_CONFIG;
  
  const {
    showTimeline,
    showGridLines,
    showNowLine,
    showTimelineGrid = showGridLines,
    showDayColumnGridLines = showGridLines,
    showGridOuterBorder = showGridLines,
    weekendNoSlotDays = [],
    weekendNoSlotLabel,
    emptySlotMergeHours = 1,
    translationNamespace = 'MySchedule',
  } = themeConfig;

  const timeColumnWidth = getCompactValue(
    isCompact,
    CALENDAR_CONFIG.TIME_COLUMN_WIDTH.COMPACT,
    CALENDAR_CONFIG.TIME_COLUMN_WIDTH.NORMAL
  );

  const rowHeight = themeConfig.rowHeight ?? getCompactValue(
    isCompact,
    CALENDAR_CONFIG.ROW_HEIGHT.COMPACT,
    CALENDAR_CONFIG.ROW_HEIGHT.NORMAL
  );

  const gapRowHeight = themeConfig.gapRowHeight ?? getCompactValue(
    isCompact,
    CALENDAR_CONFIG.GAP_ROW_HEIGHT.COMPACT,
    CALENDAR_CONFIG.GAP_ROW_HEIGHT.NORMAL
  );

  const slotPadding = isCompact ? 6 : 8;
  const eventPadding = themeConfig.eventPadding ?? slotPadding;
  const eventTopPadding = themeConfig.eventTopPadding ?? eventPadding;

  const rowModels = useMemo(
    () => buildRowModels(weekHours, events, currentHour, enableGapCollapse, minGapHours),
    [weekHours, events, currentHour, enableGapCollapse, minGapHours]
  );

  const layoutEngine = useMemo(
    () => new CalendarLayoutEngine(rowModels, { rowHeight, gapRowHeight }),
    [rowModels, rowHeight, gapRowHeight]
  );

  const eventsByDay = useMemo(() => {
    const grouped = new Map<number, CalendarEvent<TEvent>[]>();
    for (const event of events) {
      const dayEvents = grouped.get(event.dayIndex) ?? [];
      dayEvents.push(event);
      grouped.set(event.dayIndex, dayEvents);
    }
    return grouped;
  }, [events]);

  const columnConfig: CalendarColumnConfig<TEvent> = useMemo(
    () => ({
      layoutEngine,
      rowHeight,
      slotPadding,
      eventPadding,
      eventTopPadding,
      readonly,
      isCompact,
      showNowLine,
      currentHour,
      headerHeight: CALENDAR_CONFIG.HEADER_HEIGHT,
      onSlotClick,
      onEventClick,
      renderEvent,
      renderSlot,
      weekendNoSlotDays,
      weekendNoSlotLabel,
      emptySlotMergeHours,
    }),
    [
      layoutEngine,
      rowHeight,
      slotPadding,
      eventPadding,
      eventTopPadding,
      readonly,
      isCompact,
      showNowLine,
      currentHour,
      onSlotClick,
      onEventClick,
      renderEvent,
      renderSlot,
      weekendNoSlotDays,
      weekendNoSlotLabel,
      emptySlotMergeHours,
    ]
  );

  return (
    <div
      className={`w-full overflow-hidden ${showGridOuterBorder ? 'border rounded-[14px]' : ''}`}
      style={{
        borderColor: showGridOuterBorder ? `var(--calendar-${type}-grid-border)` : 'transparent',
      }}
    >
      <div
        className={`w-full flex ${showGridLines ? '' : 'pb-2'}`}
        style={{
          minHeight: CALENDAR_CONFIG.HEADER_HEIGHT,
          backgroundColor: `var(--calendar-${type}-grid-header-bg)`,
        }}
      >
        {showTimeline && (
          <div
            className={showGridLines ? 'border-r' : ''}
            style={{
              width: timeColumnWidth,
              borderColor: showGridLines ? `var(--calendar-${type}-grid-border)` : 'transparent',
            }}
          />
        )}

        {weekDays.map((day, dayIndex) => (
          <CalendarDayHeader
            key={`header-${dayIndex}`}
            type={type}
            day={day}
            isActive={dayIndex === currentDayIndex}
            isLast={dayIndex === weekDays.length - 1}
            showGridLines={showGridLines}
          />
        ))}
      </div>

      <div
        className="w-full relative"
        style={{
          height: layoutEngine.totalHeight,
          backgroundColor: `var(--calendar-${type}-grid-body-bg)`,
        }}
      >
        <CalendarGridLayer
          type={type}
          rowModels={rowModels}
          layoutEngine={layoutEngine}
          showTimeline={showTimeline}
          showGridLines={showGridLines}
          showTimelineGrid={showTimelineGrid}
          showDayColumnGridLines={showDayColumnGridLines}
          timeColumnWidth={timeColumnWidth}
          rowHeight={rowHeight}
          gapRowHeight={gapRowHeight}
          formatHour={formatHour24}
          formatRangeLabel={formatRangeLabel}
          translationNamespace={translationNamespace}
        />

        <div className="absolute top-0 left-0 w-full h-full flex pointer-events-none">
          {showTimeline && (
            <div className="pointer-events-none" style={{ width: timeColumnWidth }} />
          )}

          {weekDays.map((_day, dayIndex) => (
            <CalendarColumn
              key={`col-${dayIndex}`}
              type={type}
              dayIndex={dayIndex}
              events={eventsByDay.get(dayIndex) ?? []}
              rowModels={rowModels}
              isLast={dayIndex === weekDays.length - 1}
              isActive={dayIndex === currentDayIndex}
              showGridLines={showGridLines}
              showTimelineGrid={showTimelineGrid}
              config={columnConfig}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
