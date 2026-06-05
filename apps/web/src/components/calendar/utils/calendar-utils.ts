import { CALENDAR_DAY_END_HOUR, filterCalendarWeekHourTicks } from '@mezon-tutors/shared';
import type { CalendarRowModel, CalendarEvent } from '../types';

export type CalendarLayoutConfig = {
  rowHeight: number;
  gapRowHeight: number;
};

export class CalendarLayoutEngine {
  public totalHeight = 0;
  private hourYs = new Map<number, number>();

  constructor(
    public rowModels: CalendarRowModel[],
    public config: CalendarLayoutConfig
  ) {
    let currentY = 0;

    this.rowModels.forEach((model) => {
      if (model.type === 'hour') {
        this.hourYs.set(model.hour, currentY);
        currentY += config.rowHeight;
      } else {
        for (let h = model.startHour; h < model.endHour; h++) {
          this.hourYs.set(h, currentY);
        }
        currentY += config.gapRowHeight;
      }
    });

    const hourRowTicks = rowModels
      .filter((m): m is Extract<CalendarRowModel, { type: 'hour' }> => m.type === 'hour')
      .map((m) => m.hour);

    if (hourRowTicks.length > 0) {
      const lastHour = Math.max(...hourRowTicks);
      const lastY = this.hourYs.get(lastHour);
      if (lastY !== undefined) {
        this.hourYs.set(CALENDAR_DAY_END_HOUR, lastY + config.rowHeight);
      }
    }

    this.totalHeight = currentY;
  }

  getY(hour: number): number {
    const upperHour = Math.ceil(hour);
    const lowerHour = Math.floor(hour);

    const lowerY = this.hourYs.get(lowerHour) ?? this.extrapolateLowerOrUpper(lowerHour);

    if (upperHour === lowerHour) {
      return lowerY;
    }

    const upperY = this.hourYs.get(upperHour) ?? this.extrapolateLowerOrUpper(upperHour);
    const fraction = hour - lowerHour;

    return lowerY + (upperY - lowerY) * fraction;
  }

  private extrapolateLowerOrUpper(targetHour: number): number {
    if (this.rowModels.length === 0) return 0;

    let closestLowerHour = -1;
    let closestLowerY = 0;

    for (const [hour, y] of Array.from(this.hourYs.entries())) {
      if (hour <= targetHour && hour > closestLowerHour) {
        closestLowerHour = hour;
        closestLowerY = y;
      }
    }

    if (closestLowerHour !== -1) {
      return closestLowerY + (targetHour - closestLowerHour) * this.config.rowHeight;
    }

    const firstModel = this.rowModels[0];
    const firstHour = firstModel.type === 'hour' ? firstModel.hour : firstModel.startHour;

    if (targetHour < firstHour) {
      return (targetHour - firstHour) * this.config.rowHeight;
    }

    return 0;
  }
}

export function buildRowModels(
  weekHours: number[],
  events: CalendarEvent[],
  currentHour: number | undefined,
  enableGapCollapse: boolean,
  minGapHours: number
): CalendarRowModel[] {
  if (!weekHours.length) {
    return [];
  }

  const displayHours = filterCalendarWeekHourTicks(weekHours);

  if (!enableGapCollapse) {
    return displayHours.map((hour) => ({ type: 'hour', hour }));
  }

  const sortedHours = [...displayHours].sort((a, b) => a - b);
  const currentHourBucket = currentHour === undefined ? undefined : Math.floor(currentHour);

  const occupiedHours = new Set<number>();
  events.forEach((e) => {
    const rawEnd = e.endHour ?? e.startHour + 1;
    const end =
      rawEnd > e.startHour ? Math.max(e.startHour + 1, rawEnd) : 24;
    for (let h = Math.floor(e.startHour); h < end; h++) {
      occupiedHours.add(h);
    }
  });

  const rows: CalendarRowModel[] = [];
  let index = 0;

  while (index < sortedHours.length) {
    const hour = sortedHours[index];
    const isOccupied = occupiedHours.has(hour);
    const isCurrentHour = hour === currentHourBucket;

    if (isOccupied || isCurrentHour) {
      rows.push({ type: 'hour', hour });
      index += 1;
      continue;
    }

    const startIndex = index;
    while (index < sortedHours.length) {
      const cursorHour = sortedHours[index];
      if (occupiedHours.has(cursorHour) || cursorHour === currentHourBucket) {
        break;
      }
      index += 1;
    }

    const emptySlotCount = index - startIndex;

    if (emptySlotCount >= minGapHours) {
      const startHour = sortedHours[startIndex];
      const lastEmptyHour = sortedHours[index - 1] ?? startHour;
      const endHour = Math.min(24, lastEmptyHour + 1);
      rows.push({
        type: 'gap',
        startHour,
        endHour,
        /** Wall-clock span (matches formatRangeLabel), not discrete weekHours indices (0–24 ⇒ 25 ticks). */
        hourCount: endHour - startHour,
      });
    } else {
      for (let i = startIndex; i < index; i++) {
        rows.push({ type: 'hour', hour: sortedHours[i] });
      }
    }
  }

  return rows;
}
