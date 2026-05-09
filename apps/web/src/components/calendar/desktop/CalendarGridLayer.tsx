import { useTranslations } from 'next-intl';
import type { CalendarType, CalendarRowModel } from '../types';
import type { CalendarLayoutEngine } from '../utils/calendar-utils';

type CalendarGridLayerProps = {
  type: CalendarType;
  rowModels: CalendarRowModel[];
  layoutEngine: CalendarLayoutEngine;
  showTimeline: boolean;
  showGridLines: boolean;
  showTimelineGrid?: boolean;
  showDayColumnGridLines?: boolean;
  timeColumnWidth: number;
  rowHeight: number;
  gapRowHeight: number;
  formatHour: (hour: number) => string;
  formatRangeLabel: (start: number, end: number) => string;
  translationNamespace?: string;
};

type GridGapItemProps = {
  type: CalendarType;
  row: Extract<CalendarRowModel, { type: 'gap' }>;
  layoutEngine: CalendarLayoutEngine;
  showTimeline: boolean;
  showTimelineGrid?: boolean;
  showDayColumnGridLines?: boolean;
  timeColumnWidth: number;
  gapRowHeight: number;
  formatRangeLabel: (start: number, end: number) => string;
  translationNamespace?: string;
};

function GridGapItem({
  type,
  row,
  layoutEngine,
  showTimeline,
  showTimelineGrid = true,
  showDayColumnGridLines = true,
  timeColumnWidth,
  gapRowHeight,
  formatRangeLabel,
  translationNamespace = 'MySchedule',
}: GridGapItemProps) {
  const t = useTranslations(translationNamespace);
  const top = layoutEngine.getY(row.startHour);

  return (
    <>
      {showDayColumnGridLines && (
        <div
          className="absolute w-full border-t pointer-events-none"
          style={{
            top,
            height: gapRowHeight,
            backgroundColor: `var(--calendar-${type}-gap-cell-bg)`,
            borderColor: `var(--calendar-${type}-grid-border)`,
          }}
        />
      )}
      {showTimeline && (
        <div
          className={`absolute flex flex-col items-center justify-center px-1 gap-0.5 ${showTimelineGrid ? 'border-r border-t' : ''}`}
          style={{
            top,
            width: timeColumnWidth,
            height: gapRowHeight,
            backgroundColor: `var(--calendar-${type}-gap-cell-bg)`,
            borderColor: `var(--calendar-${type}-grid-border)`,
          }}
        >
          <span
            className="text-[10px] font-medium text-center truncate"
            style={{ color: `var(--calendar-${type}-gap-label)` }}
          >
            {formatRangeLabel(row.startHour, row.endHour)}
          </span>
          <span
            className="text-[9px] font-medium"
            style={{ color: `var(--calendar-${type}-gap-hint)` }}
          >
            {t('weekGrid.emptyHours', { hours: row.hourCount })}
          </span>
        </div>
      )}
    </>
  );
}

type GridHourItemProps = {
  type: CalendarType;
  row: Extract<CalendarRowModel, { type: 'hour' }>;
  layoutEngine: CalendarLayoutEngine;
  showTimeline: boolean;
  showTimelineGrid?: boolean;
  showDayColumnGridLines?: boolean;
  timeColumnWidth: number;
  rowHeight: number;
  formatHour: (hour: number) => string;
};

function GridHourItem({
  type,
  row,
  layoutEngine,
  showTimeline,
  showTimelineGrid = true,
  showDayColumnGridLines = true,
  timeColumnWidth,
  rowHeight,
  formatHour,
}: GridHourItemProps) {
  const top = layoutEngine.getY(row.hour);

  return (
    <>
      {showDayColumnGridLines && (
        <div
          className="absolute w-full border-t pointer-events-none"
          style={{
            top,
            height: rowHeight,
            borderColor: `var(--calendar-${type}-grid-border)`,
          }}
        />
      )}
      {showTimeline && (
        <div
          className={`absolute flex items-start justify-center pt-2.5 ${showTimelineGrid ? 'border-r border-t' : ''}`}
          style={{
            top,
            width: timeColumnWidth,
            height: rowHeight,
            borderColor: `var(--calendar-${type}-grid-border)`,
          }}
        >
          <span
            className="text-[11px] font-medium"
            style={{ color: `var(--calendar-${type}-time-label)` }}
          >
            {formatHour(row.hour)}
          </span>
        </div>
      )}
    </>
  );
}

export function CalendarGridLayer({
  type,
  rowModels,
  layoutEngine,
  showTimeline,
  showGridLines,
  showTimelineGrid,
  showDayColumnGridLines,
  timeColumnWidth,
  rowHeight,
  gapRowHeight,
  formatHour,
  formatRangeLabel,
  translationNamespace,
}: CalendarGridLayerProps) {
  return (
    <>
      {rowModels.map((row) => {
        if (row.type === 'gap') {
          return (
            <GridGapItem
              key={`gap-${row.startHour}-${row.endHour}`}
              type={type}
              row={row}
              layoutEngine={layoutEngine}
              showTimeline={showTimeline}
              showTimelineGrid={showTimelineGrid}
              showDayColumnGridLines={showDayColumnGridLines}
              timeColumnWidth={timeColumnWidth}
              gapRowHeight={gapRowHeight}
              formatRangeLabel={formatRangeLabel}
              translationNamespace={translationNamespace}
            />
          );
        }
        return (
          <GridHourItem
            key={`hour-${row.hour}`}
            type={type}
            row={row}
            layoutEngine={layoutEngine}
            showTimeline={showTimeline}
            showTimelineGrid={showTimelineGrid}
            showDayColumnGridLines={showDayColumnGridLines}
            timeColumnWidth={timeColumnWidth}
            rowHeight={rowHeight}
            formatHour={formatHour}
          />
        );
      })}
    </>
  );
}
