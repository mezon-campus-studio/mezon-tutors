'use client';

import {
  CALENDAR_CONFIG,
  formatTimezoneToUTC,
  minutesToTime,
  timeToMinutes as parseTimeToMinutes,
} from '@mezon-tutors/shared';
import dayjs from 'dayjs';
import timezonePlugin from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Button, Dialog, DialogContent } from '@/components/ui';
import { cn } from '@/lib/utils';

dayjs.extend(utc);
dayjs.extend(timezonePlugin);

const { SLOT_MINUTES, COMPACT_BLOCK_HOURS, MODAL_MAX_HEIGHT } = CALENDAR_CONFIG.SCHEDULE_VIEWER;
const DAY_COUNT = CALENDAR_CONFIG.DAYS_PER_WEEK;
const MINUTES_PER_DAY = 24 * 60;
const DEFAULT_TIMEZONE = 'UTC';

/** Wall-clock slot in `timezone` (YYYY-MM-DD + HH:mm), not UTC. */
export type ScheduleSlotInput = {
  date: string;
  startTime: string;
  endTime?: string;
};

export interface ScheduleViewerProps {
  /** Slots expanded for the viewer; use `utcWeeklySlotsToCalendarInstances` when DB stores UTC weekly rows. */
  availableSlots: ScheduleSlotInput[];
  className?: string;
  /** IANA timezone used for week headers and cell timestamps (typically `useUserTimezone()`). */
  timezone?: string;
}

export interface ScheduleViewerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableSlots: ScheduleSlotInput[];
  timezone?: string;
}

type WeekDate = {
  id: string;
  anchorDate: Date;
  shortWeekdayLabel: string;
  dayNumberLabel: string;
};

type TimeBlock = {
  label: string;
  startHour: number;
  endHour: number;
};

function resolveTimezone(timezoneName?: string): string {
  const candidate = timezoneName?.trim();
  if (!candidate) {
    return DEFAULT_TIMEZONE;
  }

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: candidate }).format(new Date());
    return candidate;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

function normalizeEndTime(startTime: string, endTime?: string): string {
  if (endTime) return endTime;
  return minutesToTime(parseTimeToMinutes(startTime) + SLOT_MINUTES);
}

function getCompactTimeBlocks(): TimeBlock[] {
  const blocks: TimeBlock[] = [];

  for (let hour = 0; hour < 24; hour += COMPACT_BLOCK_HOURS) {
    const startHour = hour;
    const endHour = hour + COMPACT_BLOCK_HOURS;
    const formatHour = (h: number) => String(h).padStart(2, '0');

    blocks.push({
      label: `${formatHour(startHour)} - ${formatHour(endHour)}`,
      startHour,
      endHour,
    });
  }

  return blocks;
}

function hasAvailableSlotInBlock(
  date: string,
  block: TimeBlock,
  availableCellSet: Set<string>
): boolean {
  const startMinutes = block.startHour * 60;
  const endMinutes = block.endHour * 60;

  for (let minute = startMinutes; minute < endMinutes; minute += SLOT_MINUTES) {
    const timeStr = minutesToTime(minute);
    if (availableCellSet.has(`${date}|${timeStr}`)) {
      return true;
    }
  }

  return false;
}

function buildAvailableCellSet(slots: ScheduleSlotInput[]): Set<string> {
  const set = new Set<string>();

  for (const slot of slots) {
    const start = parseTimeToMinutes(slot.startTime);
    const end = parseTimeToMinutes(normalizeEndTime(slot.startTime, slot.endTime));

    for (let minute = start; minute + SLOT_MINUTES <= end; minute += SLOT_MINUTES) {
      set.add(`${slot.date}|${minutesToTime(minute)}`);
    }
  }

  return set;
}

function getWeekStartMonday(timezoneName: string): dayjs.Dayjs {
  const today = dayjs().tz(timezoneName).startOf('day');
  const jsDay = today.day(); // 0:Sun ... 6:Sat
  const distanceToMonday = jsDay === 0 ? 6 : jsDay - 1;
  return today.subtract(distanceToMonday, 'day');
}

function generateWeekDates(
  baseWeekStart: dayjs.Dayjs,
  weekOffset: number,
  timezoneName: string,
  locale: string
): WeekDate[] {
  const start = baseWeekStart.add(weekOffset * DAY_COUNT, 'day');
  const weekdayFormatter = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    timeZone: timezoneName,
  });
  const dayFormatter = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    timeZone: timezoneName,
  });

  return Array.from({ length: DAY_COUNT }).map((_, index) => {
    const date = start.add(index, 'day');
    const id = date.format('YYYY-MM-DD');
    const anchorDate = dayjs.tz(`${id} 12:00`, 'YYYY-MM-DD HH:mm', timezoneName).toDate();

    return {
      id,
      anchorDate,
      shortWeekdayLabel: weekdayFormatter.format(anchorDate).toUpperCase(),
      dayNumberLabel: dayFormatter.format(anchorDate),
    };
  });
}

function formatWeekRangeLabel(weekDates: WeekDate[], locale: string, timezoneName: string): string {
  if (!weekDates.length) {
    return '';
  }

  const formatter = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: timezoneName,
  });

  return `${formatter.format(weekDates[0].anchorDate)} - ${formatter.format(
    weekDates[DAY_COUNT - 1].anchorDate
  )}`;
}

function toCellTimestamp(date: string, startTime: string, timezoneName: string): number {
  return dayjs.tz(`${date} ${startTime}`, 'YYYY-MM-DD HH:mm', timezoneName).valueOf();
}

export function ScheduleViewer({
  availableSlots,
  className,
  timezone = DEFAULT_TIMEZONE,
}: ScheduleViewerProps) {
  const t = useTranslations('Tutors.Detail');
  const locale = useLocale();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const effectiveTimezone = useMemo(() => resolveTimezone(timezone), [timezone]);
  const formattedTimezone = useMemo(
    () => formatTimezoneToUTC(effectiveTimezone),
    [effectiveTimezone]
  );
  const baseWeekStart = useMemo(() => getWeekStartMonday(effectiveTimezone), [effectiveTimezone]);
  const weekDates = useMemo(
    () => generateWeekDates(baseWeekStart, 0, effectiveTimezone, locale),
    [baseWeekStart, effectiveTimezone, locale]
  );
  const timeBlocks = useMemo(() => getCompactTimeBlocks(), []);
  const availableCellSet = useMemo(() => buildAvailableCellSet(availableSlots), [availableSlots]);

  return (
    <>
      <div className={cn('space-y-4 rounded-2xl bg-background p-4 sm:p-2', className)}>
        <div className="overflow-auto rounded-xl border">
          <div className="min-w-[700px]">
            <div className="sticky top-0 z-20 grid grid-cols-[100px_repeat(7,minmax(0,1fr))] border-b bg-background">
              <div className="sticky left-0 z-30 flex items-center justify-center border-r bg-background px-2 py-3 text-xs font-semibold text-muted-foreground break-words text-center leading-tight">
                {formattedTimezone}
              </div>
              {weekDates.map((day) => (
                <div
                  key={day.id}
                  className="border-r px-2 py-3 text-center last:border-r-0"
                >
                  <p className="text-xs font-bold text-primary">{day.shortWeekdayLabel}</p>
                  <p className="text-base font-semibold">{day.dayNumberLabel}</p>
                </div>
              ))}
            </div>

            {timeBlocks.map((block) => (
              <div
                key={block.label}
                className="grid grid-cols-[100px_repeat(7,minmax(0,1fr))] border-b last:border-b-0"
              >
                <div className="sticky left-0 z-10 flex items-center justify-center border-r bg-background px-2 py-4 text-sm text-muted-foreground">
                  {block.label}
                </div>
                {weekDates.map((day) => {
                  const hasSlot = hasAvailableSlotInBlock(day.id, block, availableCellSet);

                  return (
                    <div
                      key={`${day.id}-${block.label}`}
                      className={cn(
                        'border-r last:border-r-0 transition-colors',
                        hasSlot ? 'bg-violet-500' : 'bg-muted/25'
                      )}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-center pt-3">
          <Button
            variant="outline"
            size="lg"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-full border border-violet-200 bg-white px-4 text-sm font-semibold text-violet-700 shadow-sm shadow-violet-100/50 transition hover:border-violet-300 hover:bg-violet-50 sm:h-10 sm:w-auto"
          >
            {t('viewFullSchedule')}
          </Button>
        </div>
      </div>

      <ScheduleViewerModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        availableSlots={availableSlots}
        timezone={effectiveTimezone}
      />
    </>
  );
}

export function ScheduleViewerModal({
  open,
  onOpenChange,
  availableSlots,
  timezone = DEFAULT_TIMEZONE,
}: ScheduleViewerModalProps) {
  const t = useTranslations('Tutors.Detail');
  const tSchedule = useTranslations('Common.ScheduleSelection');
  const locale = useLocale();
  const [weekOffset, setWeekOffset] = useState(0);

  const effectiveTimezone = useMemo(() => resolveTimezone(timezone), [timezone]);
  const formattedTimezone = useMemo(
    () => formatTimezoneToUTC(effectiveTimezone),
    [effectiveTimezone]
  );
  const baseWeekStart = useMemo(() => getWeekStartMonday(effectiveTimezone), [effectiveTimezone]);
  const weekDates = useMemo(
    () => generateWeekDates(baseWeekStart, weekOffset, effectiveTimezone, locale),
    [baseWeekStart, weekOffset, effectiveTimezone, locale]
  );
  const weekRangeLabel = useMemo(
    () => formatWeekRangeLabel(weekDates, locale, effectiveTimezone),
    [weekDates, locale, effectiveTimezone]
  );
  const availableCellSet = useMemo(() => buildAvailableCellSet(availableSlots), [availableSlots]);

  const timeRows = useMemo(() => {
    return Array.from({ length: MINUTES_PER_DAY / SLOT_MINUTES }).map((_, index) =>
      minutesToTime(index * SLOT_MINUTES)
    );
  }, []);

  const scrollBodyRef = useRef<HTMLDivElement>(null);

  const scrollTargetRowStartTime = useMemo(() => {
    const nowMs = dayjs().tz(effectiveTimezone).valueOf();
    let bestTs = Number.POSITIVE_INFINITY;
    let bestRow: string | null = null;

    for (const day of weekDates) {
      for (const startTime of timeRows) {
        const key = `${day.id}|${startTime}`;
        if (!availableCellSet.has(key)) continue;

        const ts = toCellTimestamp(day.id, startTime, effectiveTimezone);
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
  }, [availableCellSet, effectiveTimezone, timeRows, weekDates]);

  useLayoutEffect(() => {
    if (!open || !scrollTargetRowStartTime) {
      return;
    }
    const timerId = setTimeout(() => {
      if (!scrollBodyRef.current) return;
      const rowEl = scrollBodyRef.current.querySelector<HTMLElement>(
        `[data-schedule-row="${CSS.escape(scrollTargetRowStartTime)}"]`
      );
      rowEl?.scrollIntoView({ block: 'center', behavior: 'auto' });
    }, 150);
    return () => clearTimeout(timerId);
  }, [scrollTargetRowStartTime, weekOffset, availableSlots, open]);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent
        showCloseButton={false}
        className="!max-w-4xl !w-full max-h-[85vh] p-0 flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <h2 className="text-xl font-bold">{t('fullScheduleTitle')}</h2>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onOpenChange(false)}
          >
            <XIcon className="size-5" />
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-3 border-b shrink-0">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="size-3 rounded-full bg-violet-500" />
              <span className="font-medium">{tSchedule('status.available')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="size-3 rounded-full bg-violet-300 opacity-50" />
              <span className="font-medium">{tSchedule('status.pastAvailable')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="size-3 rounded-full border border-border bg-muted/25" />
              <span className="font-medium">{tSchedule('status.notAvailable')}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={weekOffset === 0}
              onClick={() => setWeekOffset(0)}
            >
              {tSchedule('today')}
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              disabled={weekOffset === 0}
              onClick={() => setWeekOffset((prev) => Math.max(0, prev - 1))}
            >
              <ChevronLeftIcon className="size-5" />
            </Button>
            <span className="text-sm font-semibold whitespace-nowrap">{weekRangeLabel}</span>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => setWeekOffset((prev) => prev + 1)}
            >
              <ChevronRightIcon className="size-5" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden px-6 py-4">
          <div
            ref={scrollBodyRef}
            className="overflow-auto rounded-xl border"
            style={{ maxHeight: MODAL_MAX_HEIGHT }}
          >
            <div className="min-w-[700px]">
              <div className="sticky top-0 z-20 grid grid-cols-[80px_repeat(7,minmax(0,1fr))] border-b bg-background">
                <div className="sticky left-0 z-30 flex items-center justify-center border-r bg-background px-1 py-2 text-xs font-semibold text-muted-foreground break-words text-center leading-tight">
                  {formattedTimezone}
                </div>
                {weekDates.map((day) => (
                  <div
                    key={day.id}
                    className="border-r px-1 py-2 text-center last:border-r-0"
                  >
                    <p className="text-[10px] font-bold text-primary">{day.shortWeekdayLabel}</p>
                    <p className="text-sm font-semibold">{day.dayNumberLabel}</p>
                  </div>
                ))}
              </div>

              {(() => {
                const nowMs = dayjs().tz(effectiveTimezone).valueOf();
                return timeRows.map((startTime) => (
                  <div
                    key={startTime}
                    data-schedule-row={startTime}
                    className="grid grid-cols-[80px_repeat(7,minmax(0,1fr))] border-b last:border-b-0"
                  >
                    <div className="sticky left-0 z-10 flex items-center justify-center border-r bg-background px-1 py-1.5 text-xs text-muted-foreground">
                      {startTime}
                    </div>
                    {weekDates.map((day) => {
                      const key = `${day.id}|${startTime}`;
                      const isAvailable = availableCellSet.has(key);
                      const cellTs = toCellTimestamp(day.id, startTime, effectiveTimezone);
                      const isPast = cellTs <= nowMs;

                      return (
                        <div
                          key={key}
                          className={cn(
                            'relative h-8 border-r last:border-r-0 transition-colors',
                            !isAvailable && 'bg-muted/25',
                            isAvailable && !isPast && 'bg-violet-500',
                            isAvailable && isPast && 'bg-violet-300 opacity-50'
                          )}
                        />
                      );
                    })}
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center px-6 py-4 border-t shrink-0">
          <p className="text-sm text-muted-foreground">
            {t('basedOnTimezone', { timezone: effectiveTimezone })}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
