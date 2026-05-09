'use client';

import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';

const SLOT_MINUTES = 30;
const DAY_COUNT = 7;
const MINUTES_PER_DAY = 24 * 60;

type SelectionMode = 'single' | 'multiple';

export type ScheduleSlotInput = {
  date: string;
  startTime: string;
  endTime?: string;
};

export type SelectedScheduleSlot = {
  date: string;
  startTime: string;
  endTime: string;
  label: string;
};

export interface ScheduleSelectionProps {
  availableSlots: ScheduleSlotInput[];
  selectionMode?: SelectionMode;
  value?: SelectedScheduleSlot[];
  defaultValue?: SelectedScheduleSlot[];
  onChange?: (slots: SelectedScheduleSlot[]) => void;
  onWeekChange?: (payload: { weekOffset: number; startDate: string; endDate: string }) => void;
  className?: string;
  gridClassName?: string;
  maxBodyHeight?: string;
  fillAvailableHeight?: boolean;
}

type WeekDate = {
  date: Date;
  id: string;
};

function pad2(num: number): string {
  return String(num).padStart(2, '0');
}

function formatYmd(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function parseYmd(ymd: string): Date {
  const [yearText, monthText, dayText] = ymd.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  return new Date(year, month - 1, day);
}

function parseTimeToMinutes(time: string): number {
  const [hourText, minuteText] = time.split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);
  return hour * 60 + minute;
}

function minutesToTime(minutes: number): string {
  return `${pad2(Math.floor(minutes / 60))}:${pad2(minutes % 60)}`;
}

function getWeekStartMonday(now = new Date()): Date {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const jsDay = today.getDay(); // 0:Sun...6:Sat
  const distanceToMonday = jsDay === 0 ? 6 : jsDay - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - distanceToMonday);
  return monday;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function normalizeEndTime(startTime: string, endTime?: string): string {
  if (endTime) {
    return endTime;
  }
  return minutesToTime(parseTimeToMinutes(startTime) + SLOT_MINUTES);
}

function buildSlotLabel(date: string, startTime: string, endTime: string): string {
  const fullDate = parseYmd(date);
  const left = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(fullDate);
  return `${left} . ${startTime} - ${endTime}`;
}

function toSelectedSlot(slot: ScheduleSlotInput): SelectedScheduleSlot {
  const endTime = normalizeEndTime(slot.startTime, slot.endTime);
  return {
    date: slot.date,
    startTime: slot.startTime,
    endTime,
    label: buildSlotLabel(slot.date, slot.startTime, endTime),
  };
}

function toSlotKey(slot: { date: string; startTime: string }): string {
  return `${slot.date}|${slot.startTime}`;
}

type ScheduleCellType =
  | 'empty'
  | 'emptyPast'
  | 'futureAvailable'
  | 'pastAvailable'
  | 'selected'
  | 'pastSelected';

function getScheduleCellType(input: {
  isAvailable: boolean;
  isSelected: boolean;
  isPast: boolean;
}): ScheduleCellType {
  const { isAvailable, isSelected, isPast } = input;
  if (!isAvailable) {
    return isPast ? 'emptyPast' : 'empty';
  }
  if (isPast) {
    return isSelected ? 'pastSelected' : 'pastAvailable';
  }
  if (isSelected) {
    return 'selected';
  }
  return 'futureAvailable';
}

function getScheduleCellClassName(type: ScheduleCellType): string {
  return cn(
    type === 'empty' && 'bg-muted/25',
    type === 'emptyPast' && 'bg-muted',
    type === 'futureAvailable' && 'cursor-pointer bg-primary hover:bg-primary/70',
    type === 'selected' && 'cursor-pointer bg-[#e7d65c] shadow-inner',
    type === 'pastAvailable' &&
      'cursor-not-allowed bg-primary/50 ring-1 ring-inset ring-primary/30',
    type === 'pastSelected' &&
      'cursor-not-allowed bg-[#e7d65c]/45 opacity-90 ring-2 ring-inset ring-primary/40'
  );
}

export function ScheduleSelection({
  availableSlots,
  selectionMode = 'single',
  value,
  defaultValue = [],
  onChange,
  onWeekChange,
  className,
  gridClassName,
  maxBodyHeight = '520px',
  fillAvailableHeight = false,
}: ScheduleSelectionProps) {
  const t = useTranslations('Common.ScheduleSelection');
  const [weekOffset, setWeekOffset] = useState(0);
  const [internalValue, setInternalValue] = useState<SelectedScheduleSlot[]>(defaultValue);
  const now = useMemo(() => new Date(), []);
  const baseWeekStart = useMemo(() => getWeekStartMonday(now), [now]);

  const selectedSlots = value ?? internalValue;

  const weekDates = useMemo<WeekDate[]>(() => {
    const start = addDays(baseWeekStart, weekOffset * DAY_COUNT);
    return Array.from({ length: DAY_COUNT }).map((_, index) => {
      const date = addDays(start, index);
      return { date, id: formatYmd(date) };
    });
  }, [baseWeekStart, weekOffset]);

  useEffect(() => {
    if (!weekDates.length || !onWeekChange) {
      return;
    }
    onWeekChange({
      weekOffset,
      startDate: weekDates[0].id,
      endDate: weekDates[DAY_COUNT - 1].id,
    });
  }, [onWeekChange, weekDates, weekOffset]);

  const weekRangeLabel = useMemo(() => {
    if (!weekDates.length) {
      return '';
    }
    const formatter = new Intl.DateTimeFormat('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    return `${formatter.format(weekDates[0].date)} - ${formatter.format(weekDates[DAY_COUNT - 1].date)}`;
  }, [weekDates]);

  const timeRows = useMemo(() => {
    return Array.from({ length: MINUTES_PER_DAY / SLOT_MINUTES }).map((_, index) =>
      minutesToTime(index * SLOT_MINUTES)
    );
  }, []);

  const availableCellSet = useMemo(() => {
    const set = new Set<string>();
    for (const slot of availableSlots) {
      const start = parseTimeToMinutes(slot.startTime);
      const end = parseTimeToMinutes(normalizeEndTime(slot.startTime, slot.endTime));
      for (let minute = start; minute + SLOT_MINUTES <= end; minute += SLOT_MINUTES) {
        set.add(`${slot.date}|${minutesToTime(minute)}`);
      }
    }
    return set;
  }, [availableSlots]);

  const selectedSet = useMemo(() => {
    return new Set(selectedSlots.map((slot) => toSlotKey(slot)));
  }, [selectedSlots]);

  const emitChange = (next: SelectedScheduleSlot[]) => {
    if (!value) {
      setInternalValue(next);
    }
    onChange?.(next);
  };

  const scrollTargetRowStartTime = useMemo(() => {
    const nowMs = Date.now();
    let bestTs = Number.POSITIVE_INFINITY;
    let bestRow: string | null = null;

    for (const day of weekDates) {
      for (const startTime of timeRows) {
        const key = `${day.id}|${startTime}`;
        if (!availableCellSet.has(key)) continue;
        const cellDate = parseYmd(day.id);
        const [hourText, minuteText] = startTime.split(':');
        cellDate.setHours(Number(hourText), Number(minuteText), 0, 0);
        const ts = cellDate.getTime();
        if (ts <= nowMs) continue;
        if (ts < bestTs) {
          bestTs = ts;
          bestRow = startTime;
        }
      }
    }

    if (bestRow !== null) {
      return bestRow;
    }

    for (const startTime of timeRows) {
      for (const day of weekDates) {
        if (availableCellSet.has(`${day.id}|${startTime}`)) {
          return startTime;
        }
      }
    }

    return null;
  }, [availableCellSet, timeRows, weekDates]);

  const scrollBodyRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!scrollTargetRowStartTime || !scrollBodyRef.current) {
      return;
    }
    const rowEl = scrollBodyRef.current.querySelector<HTMLElement>(
      `[data-schedule-row="${CSS.escape(scrollTargetRowStartTime)}"]`
    );
    rowEl?.scrollIntoView({ block: 'center', behavior: 'auto' });
  }, [scrollTargetRowStartTime, weekOffset, availableSlots]);

  const handleCellSelect = (date: string, startTime: string) => {
    const key = `${date}|${startTime}`;
    if (!availableCellSet.has(key)) {
      return;
    }

    const nowDate = new Date();
    const [hourText, minuteText] = startTime.split(':');
    const cellDate = parseYmd(date);
    cellDate.setHours(Number(hourText), Number(minuteText), 0, 0);
    if (cellDate <= nowDate) {
      return;
    }

    const newSlot = toSelectedSlot({ date, startTime });
    if (selectionMode === 'single') {
      emitChange([newSlot]);
      return;
    }

    const exists = selectedSet.has(key);
    if (exists) {
      emitChange(selectedSlots.filter((slot) => toSlotKey(slot) !== key));
      return;
    }
    emitChange(
      [...selectedSlots, newSlot].sort((a, b) =>
        `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`)
      )
    );
  };

  const bodyScrollStyle = fillAvailableHeight ? undefined : { maxHeight: maxBodyHeight };

  return (
    <div
      className={cn(
        'rounded-2xl border bg-background p-3 sm:p-4',
        fillAvailableHeight
          ? 'flex min-h-0 flex-1 flex-col gap-3'
          : 'space-y-3',
        className,
      )}
    >
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-base text-muted-foreground">
          <div className="flex items-center gap-2">
            <span
              className={cn('size-3 rounded-full', getScheduleCellClassName('futureAvailable'))}
            />
            <span className="font-medium">{t('status.available')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn('size-3 rounded-full', getScheduleCellClassName('pastAvailable'))}
            />
            <span className="font-medium">{t('status.pastAvailable')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'size-3 rounded-full border border-border',
                getScheduleCellClassName('empty')
              )}
            />
            <span className="font-medium">{t('status.notAvailable')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'size-3 rounded-full border border-primary/20',
                getScheduleCellClassName('selected')
              )}
            />
            <span className="font-medium">{t('status.bookedByYou')}</span>
          </div>
        </div>

        <div className="flex justify-end items-center gap-2 max-lg:w-full">
          <Button
            size="lg"
            className="text-base"
            disabled={weekOffset === 0}
            onClick={() => setWeekOffset(0)}
          >
            <CalendarIcon className="size-4" />
            {t('today')}
          </Button>
          <div className="flex items-center gap-2">
            <Button
              size="icon-sm"
              variant="ghost"
              disabled={weekOffset === 0}
              onClick={() => setWeekOffset((prev) => Math.max(0, prev - 1))}
            >
              <ChevronLeftIcon className="size-5" />
            </Button>
            <span className="w-full text-center text-base font-semibold">{weekRangeLabel}</span>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => setWeekOffset((prev) => prev + 1)}
            >
              <ChevronRightIcon className="size-5" />
            </Button>
          </div>
        </div>
      </div>

      <div
        ref={scrollBodyRef}
        className={cn(
          'min-h-0 overflow-auto rounded-xl border bg-background',
          fillAvailableHeight && 'flex-1 basis-0',
        )}
        style={bodyScrollStyle}
      >
        <div className={cn('min-w-[860px]', gridClassName)}>
          <div className="sticky top-0 z-20 grid grid-cols-[84px_repeat(7,minmax(0,1fr))] border-b bg-background">
            <div className="sticky left-0 z-30 flex items-center justify-center border-r bg-background px-2 py-2 text-base font-semibold text-muted-foreground">
              UTC+7
            </div>
            {weekDates.map((day) => (
              <div
                key={day.id}
                className="border-r px-1 py-2 text-center last:border-r-0"
              >
                <p className="text-sx font-bold text-primary">
                  {new Intl.DateTimeFormat('en-US', { weekday: 'short' })
                    .format(day.date)
                    .toUpperCase()}
                </p>
                <p className="text-base font-semibold">{day.date.getDate()}</p>
              </div>
            ))}
          </div>

          {timeRows.map((startTime) => (
            <div
              key={startTime}
              data-schedule-row={startTime}
              className="grid grid-cols-[84px_repeat(7,minmax(0,1fr))] border-b last:border-b-0"
            >
              <div className="sticky left-0 z-10 flex items-center justify-center border-r bg-background px-2 py-2 text-base text-muted-foreground">
                {startTime}
              </div>
              {weekDates.map((day) => {
                const key = `${day.id}|${startTime}`;
                const isAvailable = availableCellSet.has(key);
                const isSelected = selectedSet.has(key);
                const cellDate = parseYmd(day.id);
                const [hourText, minuteText] = startTime.split(':');
                cellDate.setHours(Number(hourText), Number(minuteText), 0, 0);
                const isPast = cellDate <= new Date();
                const disabled = !isAvailable || isPast;
                const cellType = getScheduleCellType({ isAvailable, isSelected, isPast });

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleCellSelect(day.id, startTime)}
                    disabled={disabled}
                    className={cn(
                      'relative isolate h-10 overflow-hidden border-r transition-colors last:border-r-0 disabled:opacity-100 disabled:saturate-100',
                      getScheduleCellClassName(cellType)
                    )}
                    aria-label={buildSlotLabel(
                      day.id,
                      startTime,
                      minutesToTime(parseTimeToMinutes(startTime) + SLOT_MINUTES)
                    )}
                  >
                    {cellType === 'pastAvailable' ? (
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-0 z-0 bg-[repeating-linear-gradient(-45deg,transparent,transparent_3px,rgb(0_0_0/0.08)_3px,rgb(0_0_0/0.08)_6px)] dark:bg-[repeating-linear-gradient(-45deg,transparent,transparent_3px,rgb(255_255_255/0.12)_3px,rgb(255_255_255/0.12)_6px)]"
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
