'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle, ArrowRight, Plus, Trash2 } from 'lucide-react';
import {
  availabilityToSlotsByDay,
  DAY_KEYS,
  DEFAULT_AVAILABILITY_SLOT,
  normalizeUtcAvailabilityRows,
  type TimeSlot,
  type UtcAvailabilityRow,
} from '@mezon-tutors/shared';
import { Button, TimePicker } from '@/components/ui';
import { useUserTimezone } from '@/hooks';
import { formatUtcOffsetLabel, normalizeTimezoneParam } from '@/lib/timezone';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hasAnyLocalSlot(slotsByDay: Record<string, TimeSlot[]>): boolean {
  return DAY_KEYS.some((day) => (slotsByDay[day]?.length ?? 0) > 0);
}

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minsToTime(mins: number): string {
  const hh = String(Math.floor(mins / 60) % 24).padStart(2, '0');
  const mm = String(mins % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

function getSlotError(slot: TimeSlot): string | null {
  if (!slot.startTime || !slot.endTime) return null;

  const startMins = toMinutes(slot.startTime);
  const endMins = toMinutes(slot.endTime);

  if (startMins >= endMins) {
    return 'Giờ bắt đầu phải nhỏ hơn giờ kết thúc';
  }
  if (endMins - startMins < 30) {
    return 'Khung giờ tối thiểu 30 phút';
  }
  return null;
}

function getOverlapError(slots: TimeSlot[], currentIndex: number): string | null {
  const current = slots[currentIndex];
  if (!current.startTime || !current.endTime) return null;
  if (getSlotError(current) !== null) return null;

  const cStart = toMinutes(current.startTime);
  const cEnd = toMinutes(current.endTime);

  for (let i = 0; i < slots.length; i++) {
    if (i === currentIndex) continue;
    const other = slots[i];
    if (!other.startTime || !other.endTime) continue;
    if (getSlotError(other) !== null) continue;

    const oStart = toMinutes(other.startTime);
    const oEnd = toMinutes(other.endTime);

    if (!(cEnd <= oStart || cStart >= oEnd)) {
      return `Trùng với khung giờ ${other.startTime}–${other.endTime}`;
    }
  }
  return null;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type TutorAvailabilitySelectionProps = {
  utcAvailability?: Array<
    UtcAvailabilityRow & { isActive?: boolean | null; id?: string; tutorId?: string }
  >;
  slotsByDay: Record<string, TimeSlot[]>;
  onSlotsByDayChange: (next: Record<string, TimeSlot[]>) => void;
  syncFromUtc?: boolean;
  slotsError?: string | null;
  contentRef?: React.RefObject<HTMLDivElement | null>;
  onSlotAdded?: () => void;
  showTimezoneLabel?: boolean;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function TutorAvailabilitySelection({
  utcAvailability,
  slotsByDay,
  onSlotsByDayChange,
  syncFromUtc = true,
  slotsError,
  contentRef,
  onSlotAdded,
  showTimezoneLabel = true,
}: TutorAvailabilitySelectionProps) {
  const t = useTranslations('BecomeTutor.availability');
  const userTimezone = useUserTimezone();
  const resolvedTimezone = normalizeTimezoneParam(userTimezone) ?? 'UTC';
  const timezoneLabel = useMemo(
    () => formatUtcOffsetLabel(resolvedTimezone),
    [resolvedTimezone]
  );

  const normalizedUtc = useMemo(
    () => normalizeUtcAvailabilityRows(utcAvailability ?? []),
    [utcAvailability]
  );

  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const dayTabs = t.raw('availability.tabs') as string[];
  const dayKey = DAY_KEYS[selectedDayIndex];
  const daySlots = slotsByDay[dayKey] ?? [];

  useEffect(() => {
    if (!syncFromUtc || normalizedUtc.length === 0) return;
    if (hasAnyLocalSlot(slotsByDay)) return;
    onSlotsByDayChange(availabilityToSlotsByDay(normalizedUtc, resolvedTimezone));
  }, [normalizedUtc, resolvedTimezone, syncFromUtc, slotsByDay, onSlotsByDayChange]);

  const hasInvalidSlots = daySlots.some(
    (slot, i) => getSlotError(slot) !== null || getOverlapError(daySlots, i) !== null
  );

  const addSlot = () => {
    const currentDaySlots = slotsByDay[dayKey] ?? [];
    onSlotsByDayChange({
      ...slotsByDay,
      [dayKey]: [...currentDaySlots, { ...DEFAULT_AVAILABILITY_SLOT }],
    });
    onSlotAdded?.();
  };

  const removeSlot = (index: number) => {
    const currentDaySlots = (slotsByDay[dayKey] ?? []).filter((_, i) => i !== index);
    onSlotsByDayChange({ ...slotsByDay, [dayKey]: currentDaySlots });
  };

  const updateSlot = (index: number, patch: Partial<TimeSlot>) => {
    const list = [...(slotsByDay[dayKey] ?? [])];
    list[index] = { ...list[index], ...patch };
    onSlotsByDayChange({ ...slotsByDay, [dayKey]: list });
  };

  return (
    <div ref={contentRef}>
      {showTimezoneLabel && (
        <p className="mb-4 text-md font-bold text-primary">
          {resolvedTimezone} ({timezoneLabel})
        </p>
      )}

      {/* Day tabs */}
      <div className="mb-5 flex flex-wrap gap-1.5 rounded-full border border-violet-100 bg-violet-50/40 p-1">
        {dayTabs.map((label, index) => {
          const isActive = selectedDayIndex === index;
          return (
            <button
              key={label}
              type="button"
              onClick={() => setSelectedDayIndex(index)}
              className={`min-w-fit flex-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-all sm:text-sm ${
                isActive
                  ? 'bg-[linear-gradient(110deg,#7c3aed_0%,#9333ea_50%,#db2777_100%)] text-white shadow-sm shadow-violet-300/40'
                  : 'text-slate-600 hover:bg-white hover:text-violet-700'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="space-y-3">
        {daySlots.map((slot, index) => {
          const slotError = getSlotError(slot);
          const overlapError = getOverlapError(daySlots, index);
          const errorMsg = slotError ?? overlapError;
          const hasError = errorMsg !== null;

          const endTimeMin = slot.startTime
            ? minsToTime(toMinutes(slot.startTime) + 30)
            : undefined;

          const startTimeMax = slot.endTime
            ? (() => {
                const mins = toMinutes(slot.endTime) - 30;
                return mins >= 0 ? minsToTime(mins) : undefined;
              })()
            : undefined;

          return (
            <div
              key={index}
              className={`rounded-2xl border bg-violet-50/30 p-3 transition-colors ${
                hasError ? 'border-rose-300 bg-rose-50/30' : 'border-violet-100'
              }`}
            >
              <div className="flex flex-wrap items-end gap-3">
                {/* Start time */}
                <div className="min-w-[120px] flex-1 space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {t('availability.from')}
                  </p>
                  <TimePicker
                    value={slot.startTime}
                    onChange={(v) => updateSlot(index, { startTime: v })}
                    placeholder={DEFAULT_AVAILABILITY_SLOT.startTime}
                    maxTime={startTimeMax}
                  />
                </div>

                <div className="flex items-center justify-center pb-2">
                  <ArrowRight
                    className={`size-4 ${hasError ? 'text-rose-400' : 'text-violet-400'}`}
                  />
                </div>

                {/* End time */}
                <div className="min-w-[120px] flex-1 space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {t('availability.to')}
                  </p>
                  <TimePicker
                    value={slot.endTime}
                    onChange={(v) => updateSlot(index, { endTime: v })}
                    placeholder={DEFAULT_AVAILABILITY_SLOT.endTime}
                    minTime={endTimeMin}
                  />
                </div>

                {/* Delete button */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => removeSlot(index)}
                  className="h-10 rounded-xl border-rose-200 text-rose-600 hover:border-rose-300 hover:bg-rose-50"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>

              {/* Inline slot error */}
              {hasError && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-rose-600">
                  <AlertCircle className="size-3.5 shrink-0 text-rose-500" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>
          );
        })}

        <Button
          type="button"
          onClick={addSlot}
          disabled={hasInvalidSlots}
          variant="outline"
          className="h-11 w-full rounded-full border-dashed border-violet-300 bg-white text-violet-700 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="mr-1 size-4" />
          {t('availability.addSlot')}
        </Button>

        {slotsError && (
          <div className="flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-rose-500" />
            <span>{slotsError}</span>
          </div>
        )}
      </div>
    </div>
  );
}