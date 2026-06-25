"use client";

import { CalendarIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui";
import {
  FALLBACK_TIMEZONE,
  formatUtcOffsetLabel,
  formatWeekdayShort,
  getTimezoneUtcOffsetMinutes,
  getWeekStartMondayInTimezone,
  nowInTimezone,
  parseYmdInTimezone,
} from "@/lib/timezone";
import { cn } from "@/lib/utils";

const SLOT_MINUTES = 30;
const DAY_COUNT = 7;
const MINUTES_PER_DAY = 24 * 60;

type SelectionMode = "single" | "multiple";
type ScheduleSelectionVariant = "grid" | "list";

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
  /** Shown on the grid with strikethrough styling; not selectable (e.g. occupied trial/subscription). */
  blockedSlots?: ScheduleSlotInput[];
  heldSlots?: ScheduleSlotInput[];
  selectionMode?: SelectionMode;
  maxSelections?: number;
  value?: SelectedScheduleSlot[];
  defaultValue?: SelectedScheduleSlot[];
  onChange?: (slots: SelectedScheduleSlot[]) => void;
  onWeekChange?: (payload: {
    weekOffset: number;
    startDate: string;
    endDate: string;
  }) => void;
  className?: string;
  gridClassName?: string;
  maxBodyHeight?: string;
  fillAvailableHeight?: boolean;
  gridIntervalMinutes?: number;
  lessonDurationMinutes?: number;
  timezone?: string;
  /** When true, cells are not clickable. */
  readOnly?: boolean;
  onReadOnlyCellClick?: (date: string, startTime: string) => void;
  /** Native tooltip for selectable, future slots (bookable mode). */
  selectableCellTitle?: string;
  /** List shows only bookable future slots as underlined times; grid shows the full cell matrix. */
  variant?: ScheduleSelectionVariant;
}

type WeekDate = {
  id: string;
  dayOfMonth: number;
};

function pad2(num: number): string {
  return String(num).padStart(2, "0");
}

function parseTimeToMinutes(time: string): number {
  const [hourText, minuteText] = time.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  return hour * 60 + minute;
}

function minutesToTime(minutes: number): string {
  return `${pad2(Math.floor(minutes / 60))}:${pad2(minutes % 60)}`;
}

function toCellTimestamp(
  date: string,
  startTime: string,
  timezone: string,
): number {
  const [hourText, minuteText] = startTime.split(":");
  return parseYmdInTimezone(date, timezone)
    .hour(Number(hourText))
    .minute(Number(minuteText))
    .second(0)
    .millisecond(0)
    .valueOf();
}

function normalizeEndTime(
  startTime: string,
  endTime: string | undefined,
  defaultDurationMinutes: number,
): string {
  if (endTime) {
    return endTime;
  }
  return minutesToTime(parseTimeToMinutes(startTime) + defaultDurationMinutes);
}

function formatTimezoneDisplay(timezoneName: string): string {
  const offsetMinutes = getTimezoneUtcOffsetMinutes(timezoneName);
  if (offsetMinutes === 0) {
    return `${timezoneName} GMT +0:00`;
  }
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMinutes);
  const hours = Math.floor(abs / 60);
  const minutes = abs % 60;
  const offsetLabel =
    minutes === 0
      ? `${sign}${hours}:00`
      : `${sign}${hours}:${String(minutes).padStart(2, "0")}`;
  return `${timezoneName} GMT ${offsetLabel}`;
}

function buildSlotLabel(
  date: string,
  startTime: string,
  endTime: string,
  timezone: string,
): string {
  const left = formatWeekdayShort(date, timezone);
  return `${left} . ${startTime} - ${endTime}`;
}

function toSelectedSlot(
  slot: ScheduleSlotInput,
  defaultDurationMinutes: number,
  timezone: string,
): SelectedScheduleSlot {
  const endTime = normalizeEndTime(
    slot.startTime,
    slot.endTime,
    defaultDurationMinutes,
  );
  return {
    date: slot.date,
    startTime: slot.startTime,
    endTime,
    label: buildSlotLabel(slot.date, slot.startTime, endTime, timezone),
  };
}

function toSlotKey(slot: { date: string; startTime: string }): string {
  return `${slot.date}|${slot.startTime}`;
}

type ScheduleCellType =
  | "empty"
  | "emptyPast"
  | "futureAvailable"
  | "futureAvailableMuted"
  | "pastAvailable"
  | "occupiedBlocked"
  | "paymentHoldBlocked"
  | "selected"
  | "pastSelected";

function getScheduleCellType(input: {
  isAvailable: boolean;
  isSelected: boolean;
  isPast: boolean;
  isSelectable: boolean;
  isOccupiedBlocked: boolean;
  isPaymentHoldBlocked: boolean;
}): ScheduleCellType {
  const {
    isAvailable,
    isSelected,
    isPast,
    isSelectable,
    isOccupiedBlocked,
    isPaymentHoldBlocked,
  } = input;
  if (!isAvailable) {
    return isPast ? "emptyPast" : "empty";
  }
  if (isPast) {
    return isSelected ? "pastSelected" : "pastAvailable";
  }
  if (isSelected) {
    return "selected";
  }
  if (isPaymentHoldBlocked) {
    return "paymentHoldBlocked";
  }
  if (isOccupiedBlocked) {
    return "occupiedBlocked";
  }
  if (!isSelectable) {
    return "futureAvailableMuted";
  }
  return "futureAvailable";
}

function getScheduleCellClassName(type: ScheduleCellType): string {
  return cn(
    type === "empty" && "bg-muted/25",
    type === "emptyPast" && "bg-muted",
    type === "futureAvailable" &&
      "cursor-pointer bg-primary hover:bg-primary/70",
    type === "futureAvailableMuted" &&
      "cursor-not-allowed bg-primary/40 ring-1 ring-inset ring-primary/25 saturate-75",
    type === "selected" && "cursor-pointer bg-[#e7d65c] shadow-inner",
    type === "pastAvailable" &&
      "cursor-not-allowed bg-primary/50 ring-1 ring-inset ring-primary/30",
    type === "occupiedBlocked" &&
      "cursor-not-allowed bg-primary/50 ring-1 ring-inset ring-primary/30",
    type === "paymentHoldBlocked" &&
      "cursor-not-allowed bg-amber-400/85 ring-1 ring-inset ring-amber-600/40",
    type === "pastSelected" &&
      "cursor-not-allowed bg-[#e7d65c]/45 opacity-90 ring-2 ring-inset ring-primary/40",
  );
}

function expandSlotsToCellKeys(
  slots: ScheduleSlotInput[],
  gridIntervalMinutes: number,
  lessonDurationMinutes: number,
): Set<string> {
  const set = new Set<string>();
  for (const slot of slots) {
    const start = parseTimeToMinutes(slot.startTime);
    const end = parseTimeToMinutes(
      normalizeEndTime(slot.startTime, slot.endTime, lessonDurationMinutes),
    );
    for (let minute = start; minute < end; minute += gridIntervalMinutes) {
      set.add(`${slot.date}|${minutesToTime(minute)}`);
    }
  }
  return set;
}

export function ScheduleSelection({
  availableSlots,
  blockedSlots = [],
  heldSlots = [],
  selectionMode = "single",
  maxSelections,
  value,
  defaultValue = [],
  onChange,
  onWeekChange,
  className,
  gridClassName,
  maxBodyHeight = "520px",
  fillAvailableHeight = false,
  gridIntervalMinutes = SLOT_MINUTES,
  lessonDurationMinutes = SLOT_MINUTES,
  timezone = FALLBACK_TIMEZONE,
  readOnly = false,
  onReadOnlyCellClick,
  selectableCellTitle,
  variant = "grid",
}: ScheduleSelectionProps) {
  const t = useTranslations("Common.ScheduleSelection");
  const clientTimezoneLabel = useMemo(() => {
    return formatUtcOffsetLabel(timezone);
  }, [timezone]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [internalValue, setInternalValue] =
    useState<SelectedScheduleSlot[]>(defaultValue);
  const baseWeekStart = useMemo(
    () => getWeekStartMondayInTimezone(timezone),
    [timezone],
  );

  const selectedSlots = value ?? internalValue;

  const weekDates = useMemo<WeekDate[]>(() => {
    const start = baseWeekStart.add(weekOffset * DAY_COUNT, "day");
    return Array.from({ length: DAY_COUNT }).map((_, index) => {
      const date = start.add(index, "day");
      return { id: date.format("YYYY-MM-DD"), dayOfMonth: date.date() };
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
      return "";
    }
    const formatter = new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: timezone,
    });
    const start = parseYmdInTimezone(weekDates[0].id, timezone)
      .hour(12)
      .toDate();
    const end = parseYmdInTimezone(weekDates[DAY_COUNT - 1].id, timezone)
      .hour(12)
      .toDate();
    return `${formatter.format(start)} - ${formatter.format(end)}`;
  }, [weekDates, timezone]);

  const weekRangeLabelCompact = useMemo(() => {
    if (!weekDates.length) {
      return "";
    }
    const start = parseYmdInTimezone(weekDates[0].id, timezone);
    const end = parseYmdInTimezone(weekDates[DAY_COUNT - 1].id, timezone);
    const startLabel = start.format("MMM D");
    const endLabel = end.format("D, YYYY");
    return `${startLabel} – ${endLabel}`;
  }, [weekDates, timezone]);

  const timeRows = useMemo(() => {
    return Array.from({ length: MINUTES_PER_DAY / gridIntervalMinutes }).map(
      (_, index) => minutesToTime(index * gridIntervalMinutes),
    );
  }, [gridIntervalMinutes]);

  const blockedCellSet = useMemo(
    () =>
      expandSlotsToCellKeys(
        blockedSlots,
        gridIntervalMinutes,
        lessonDurationMinutes,
      ),
    [blockedSlots, gridIntervalMinutes, lessonDurationMinutes],
  );

  const heldCellSet = useMemo(
    () =>
      expandSlotsToCellKeys(
        heldSlots,
        gridIntervalMinutes,
        lessonDurationMinutes,
      ),
    [heldSlots, gridIntervalMinutes, lessonDurationMinutes],
  );

  const { visibleAvailableCellSet, selectableCellSet } = useMemo(() => {
    const visibleAvailableCellSet = new Set<string>();
    for (const slot of availableSlots) {
      const start = parseTimeToMinutes(slot.startTime);
      const end = parseTimeToMinutes(
        normalizeEndTime(slot.startTime, slot.endTime, gridIntervalMinutes),
      );
      for (let minute = start; minute < end; minute += gridIntervalMinutes) {
        visibleAvailableCellSet.add(`${slot.date}|${minutesToTime(minute)}`);
      }
    }

    const isStartSelectable = (key: string) => {
      if (blockedCellSet.has(key) || heldCellSet.has(key)) {
        return false;
      }
      const [date, startTime] = key.split("|");
      const start = parseTimeToMinutes(startTime);
      for (
        let minute = start;
        minute < start + lessonDurationMinutes;
        minute += gridIntervalMinutes
      ) {
        const cellKey = `${date}|${minutesToTime(minute)}`;
        if (
          !visibleAvailableCellSet.has(cellKey) ||
          blockedCellSet.has(cellKey) ||
          heldCellSet.has(cellKey)
        ) {
          return false;
        }
      }
      return true;
    };

    if (lessonDurationMinutes <= gridIntervalMinutes) {
      const selectableCellSet = new Set<string>();
      for (const key of visibleAvailableCellSet) {
        if (isStartSelectable(key)) {
          selectableCellSet.add(key);
        }
      }
      return { visibleAvailableCellSet, selectableCellSet };
    }

    const selectableCellSet = new Set<string>();
    for (const key of visibleAvailableCellSet) {
      if (isStartSelectable(key)) {
        selectableCellSet.add(key);
      }
    }
    return { visibleAvailableCellSet, selectableCellSet };
  }, [
    availableSlots,
    blockedCellSet,
    heldCellSet,
    gridIntervalMinutes,
    lessonDurationMinutes,
  ]);

  const selectedSet = useMemo(() => {
    const set = new Set<string>();
    for (const slot of selectedSlots) {
      const start = parseTimeToMinutes(slot.startTime);
      const end = parseTimeToMinutes(slot.endTime);
      for (let minute = start; minute < end; minute += gridIntervalMinutes) {
        set.add(`${slot.date}|${minutesToTime(minute)}`);
      }
    }
    return set;
  }, [selectedSlots, gridIntervalMinutes]);

  const listSlotsByDay = useMemo(() => {
    if (variant !== "list") {
      return new Map<string, SelectedScheduleSlot[]>();
    }

    const nowMs = nowInTimezone(timezone).valueOf();
    const map = new Map<string, SelectedScheduleSlot[]>();
    for (const day of weekDates) {
      map.set(day.id, []);
    }

    const addSlot = (slot: SelectedScheduleSlot) => {
      const daySlots = map.get(slot.date);
      if (!daySlots) {
        return;
      }
      if (daySlots.some((entry) => entry.startTime === slot.startTime)) {
        return;
      }
      daySlots.push(slot);
    };

    for (const key of selectableCellSet) {
      const [date, startTime] = key.split("|");
      if (toCellTimestamp(date, startTime, timezone) <= nowMs) {
        continue;
      }
      addSlot(
        toSelectedSlot({ date, startTime }, lessonDurationMinutes, timezone),
      );
    }

    if (readOnly) {
      for (const slot of selectedSlots) {
        addSlot(slot);
      }
    }

    for (const daySlots of map.values()) {
      daySlots.sort((a, b) => a.startTime.localeCompare(b.startTime));
    }

    return map;
  }, [
    variant,
    weekDates,
    selectableCellSet,
    timezone,
    lessonDurationMinutes,
    readOnly,
    selectedSlots,
  ]);

  const emitChange = (next: SelectedScheduleSlot[]) => {
    if (!value) {
      setInternalValue(next);
    }
    onChange?.(next);
  };

  const scrollTargetRowStartTime = useMemo(() => {
    const nowMs = nowInTimezone(timezone).valueOf();
    let bestTs = Number.POSITIVE_INFINITY;
    let bestRow: string | null = null;

    for (const day of weekDates) {
      for (const startTime of timeRows) {
        const key = `${day.id}|${startTime}`;
        if (!selectableCellSet.has(key)) continue;
        const ts = toCellTimestamp(day.id, startTime, timezone);
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
        if (visibleAvailableCellSet.has(`${day.id}|${startTime}`)) {
          return startTime;
        }
      }
    }

    return null;
  }, [
    selectableCellSet,
    timeRows,
    timezone,
    visibleAvailableCellSet,
    weekDates,
  ]);

  const scrollBodyRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!scrollTargetRowStartTime || !scrollBodyRef.current) {
      return;
    }
    const container = scrollBodyRef.current;
    const rowEl = container.querySelector<HTMLElement>(
      `[data-schedule-row="${CSS.escape(scrollTargetRowStartTime)}"]`,
    );
    if (rowEl) {
      const top =
        rowEl.offsetTop - container.clientHeight / 2 + rowEl.clientHeight / 2;
      container.scrollTo({ top: Math.max(0, top), behavior: "auto" });
    }
  }, [scrollTargetRowStartTime]);

  const handleCellSelect = (date: string, startTime: string) => {
    if (readOnly) {
      onReadOnlyCellClick?.(date, startTime);
      return;
    }
    const key = `${date}|${startTime}`;
    if (!selectableCellSet.has(key)) {
      return;
    }

    const nowMs = nowInTimezone(timezone).valueOf();
    const cellTs = toCellTimestamp(date, startTime, timezone);
    if (cellTs <= nowMs) {
      return;
    }

    const newSlot = toSelectedSlot(
      { date, startTime },
      lessonDurationMinutes,
      timezone,
    );
    if (selectionMode === "single") {
      emitChange([newSlot]);
      return;
    }

    const exists = selectedSet.has(key);
    if (exists) {
      emitChange(selectedSlots.filter((slot) => toSlotKey(slot) !== key));
      return;
    }
    if (maxSelections != null && selectedSlots.length >= maxSelections) {
      return;
    }
    emitChange(
      [...selectedSlots, newSlot].sort((a, b) =>
        `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`),
      ),
    );
  };

  const bodyScrollStyle = fillAvailableHeight
    ? undefined
    : { maxHeight: maxBodyHeight };

  if (variant === "list") {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              size="icon-sm"
              variant="ghost"
              disabled={weekOffset === 0}
              onClick={() => setWeekOffset((prev) => Math.max(0, prev - 1))}
              aria-label={t("previousWeek")}
            >
              <ChevronLeftIcon className="size-5" />
            </Button>
            <span className="min-w-[140px] text-center text-sm font-semibold text-slate-900 sm:text-base">
              {weekRangeLabelCompact}
            </span>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => setWeekOffset((prev) => prev + 1)}
              aria-label={t("nextWeek")}
            >
              <ChevronRightIcon className="size-5" />
            </Button>
          </div>

          <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            <span className="max-w-[220px] truncate sm:max-w-none">
              {formatTimezoneDisplay(timezone)}
            </span>
            <ChevronDownIcon className="size-4 shrink-0 text-slate-400" aria-hidden />
          </div>
        </div>

        <div className="-mx-1 overflow-x-auto px-1 pb-2 sm:mx-0 sm:overflow-visible sm:px-0 sm:pb-0">
          <div className="grid min-w-[400px] grid-cols-7 gap-1 sm:min-w-0 sm:gap-2">
            {weekDates.map((day) => {
              const daySlots = listSlotsByDay.get(day.id) ?? [];
            const hasSlots = daySlots.length > 0;

            return (
              <div key={day.id} className="min-w-0">
                <div
                  className={cn(
                    "mb-3 h-1 rounded-full",
                    hasSlots ? "bg-violet-600/95" : "bg-slate-200",
                  )}
                  aria-hidden
                />
                <div className="text-center">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {parseYmdInTimezone(day.id, timezone)
                      .format("ddd")
                      .slice(0, 3)}
                  </p>
                  <p className="text-lg font-bold text-slate-900">{day.dayOfMonth}</p>
                </div>
                <div className="mt-3 flex flex-col items-center gap-2">
                  {daySlots.map((slot) => {
                    const slotKey = toSlotKey(slot);
                    const isSelected = selectedSet.has(slotKey);
                    const isClickable =
                      !readOnly && selectableCellSet.has(slotKey);

                    return (
                      <button
                        key={slotKey}
                        type="button"
                        onClick={() => handleCellSelect(day.id, slot.startTime)}
                        disabled={readOnly && !isSelected && !onReadOnlyCellClick}
                        title={
                          (isClickable || onReadOnlyCellClick) && selectableCellTitle
                            ? selectableCellTitle
                            : undefined
                        }
                        className={cn(
                          "text-sm font-medium underline decoration-1 underline-offset-4 transition-colors",
                          isSelected
                            ? "text-violet-600 decoration-violet-500"
                            : isClickable
                              ? "cursor-pointer text-slate-900 decoration-slate-400 hover:text-violet-600 hover:decoration-violet-500"
                              : cn("text-slate-600 decoration-slate-300", onReadOnlyCellClick ? "cursor-pointer" : "cursor-default"),
                          readOnly && !isSelected && cn("opacity-80", !onReadOnlyCellClick && "cursor-default"),
                        )}
                        aria-label={slot.label}
                        aria-pressed={isSelected}
                      >
                        {slot.startTime}
                      </button>
                    );
                  })}
                </div>
              </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border bg-background p-3 sm:p-4",
        fillAvailableHeight
          ? "flex min-h-0 flex-1 flex-col gap-3"
          : "space-y-3",
        className,
      )}
    >
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-base text-muted-foreground">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "size-3 rounded-full",
                getScheduleCellClassName("futureAvailable"),
              )}
            />
            <span className="font-medium">{t("status.available")}</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "relative size-3 overflow-hidden rounded-full",
                getScheduleCellClassName("pastAvailable"),
              )}
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(-45deg,transparent,transparent_2px,rgb(0_0_0/0.12)_2px,rgb(0_0_0/0.12)_4px)]"
              />
            </span>
            <span className="font-medium">{t("status.pastAvailable")}</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "relative size-3 overflow-hidden rounded-full",
                getScheduleCellClassName("occupiedBlocked"),
              )}
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(-45deg,transparent,transparent_2px,rgb(0_0_0/0.12)_2px,rgb(0_0_0/0.12)_4px)]"
              />
            </span>
            <span className="font-medium">{t("status.occupiedBlocked")}</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "size-3 rounded-full",
                getScheduleCellClassName("paymentHoldBlocked"),
              )}
            />
            <span className="font-medium">{t("status.paymentHoldBlocked")}</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "size-3 rounded-full border border-border",
                getScheduleCellClassName("empty"),
              )}
            />
            <span className="font-medium">{t("status.notAvailable")}</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "size-3 rounded-full border border-primary/20",
                getScheduleCellClassName("selected"),
              )}
            />
            <span className="font-medium">{t("status.bookedByYou")}</span>
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
            {t("today")}
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
            <span className="w-full text-center text-base font-semibold">
              {weekRangeLabel}
            </span>
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
          "relative min-h-0 overflow-auto rounded-xl border bg-background",
          fillAvailableHeight && "flex-1 basis-0",
        )}
        style={bodyScrollStyle}
      >
        <div className={cn("min-w-[860px]", gridClassName)}>
          <div className="sticky top-0 z-20 grid grid-cols-[84px_repeat(7,minmax(0,1fr))] border-b bg-background">
            <div className="sticky left-0 z-30 flex items-center justify-center border-r bg-background px-2 py-2 text-base font-semibold text-muted-foreground">
              {clientTimezoneLabel}
            </div>
            {weekDates.map((day) => (
              <div
                key={day.id}
                className="border-r px-1 py-2 text-center last:border-r-0"
              >
                <p className="text-sx font-bold text-primary">
                  {parseYmdInTimezone(day.id, timezone)
                    .format("ddd")
                    .toUpperCase()}
                </p>
                <p className="text-base font-semibold">{day.dayOfMonth}</p>
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
                const isAvailable = visibleAvailableCellSet.has(key);
                const isSelectable = selectableCellSet.has(key);
                const isSelected = selectedSet.has(key);
                const nowMs = nowInTimezone(timezone).valueOf();
                const isPast =
                  toCellTimestamp(day.id, startTime, timezone) <= nowMs;
                const isPaymentHoldBlocked =
                  isAvailable && !isPast && heldCellSet.has(key);
                const isOccupiedBlocked =
                  isAvailable &&
                  !isPast &&
                  !isPaymentHoldBlocked &&
                  blockedCellSet.has(key);
                const disabled =
                  isPast ||
                  isOccupiedBlocked ||
                  isPaymentHoldBlocked ||
                  !isSelectable;
                const cellType = getScheduleCellType({
                  isAvailable,
                  isSelected,
                  isPast,
                  isSelectable,
                  isOccupiedBlocked,
                  isPaymentHoldBlocked,
                });
                const cellTitle =
                  (!readOnly || !!onReadOnlyCellClick) &&
                  selectableCellTitle &&
                  isSelectable &&
                  !isPast &&
                  !isOccupiedBlocked &&
                  !isPaymentHoldBlocked
                    ? selectableCellTitle
                    : undefined;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleCellSelect(day.id, startTime)}
                    disabled={disabled}
                    title={cellTitle}
                    className={cn(
                      "relative isolate h-10 overflow-hidden border-r transition-colors last:border-r-0 disabled:opacity-100 disabled:saturate-100",
                      isSelectable && !disabled && "cursor-pointer",
                      getScheduleCellClassName(cellType),
                    )}
                    aria-label={buildSlotLabel(
                      day.id,
                      startTime,
                      minutesToTime(
                        parseTimeToMinutes(startTime) + lessonDurationMinutes,
                      ),
                      timezone,
                    )}
                  >
                    {cellType === "pastAvailable" ||
                    cellType === "occupiedBlocked" ? (
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
