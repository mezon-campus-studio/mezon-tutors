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

function hasAnyLocalSlot(slotsByDay: Record<string, TimeSlot[]>): boolean {
  return DAY_KEYS.some((day) => (slotsByDay[day]?.length ?? 0) > 0);
}

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
    if (!syncFromUtc || normalizedUtc.length === 0) {
      return;
    }
    if (hasAnyLocalSlot(slotsByDay)) {
      return;
    }
    onSlotsByDayChange(availabilityToSlotsByDay(normalizedUtc, resolvedTimezone));
  }, [normalizedUtc, resolvedTimezone, syncFromUtc, slotsByDay, onSlotsByDayChange]);

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
        {daySlots.map((slot, index) => (
          <div
            key={index}
            className="flex flex-wrap items-end gap-3 rounded-2xl border border-violet-100 bg-violet-50/30 p-3"
          >
            <div className="min-w-[120px] flex-1 space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {t('availability.from')}
              </p>
              <TimePicker
                value={slot.startTime}
                onChange={(v) => updateSlot(index, { startTime: v })}
                placeholder={DEFAULT_AVAILABILITY_SLOT.startTime}
              />
            </div>
            <div className="flex items-center justify-center pb-2">
              <ArrowRight className="size-4 text-violet-400" />
            </div>
            <div className="min-w-[120px] flex-1 space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {t('availability.to')}
              </p>
              <TimePicker
                value={slot.endTime}
                onChange={(v) => updateSlot(index, { endTime: v })}
                placeholder={DEFAULT_AVAILABILITY_SLOT.endTime}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => removeSlot(index)}
              className="h-10 rounded-xl border-rose-200 text-rose-600 hover:border-rose-300 hover:bg-rose-50"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}

        <Button
          type="button"
          onClick={addSlot}
          variant="outline"
          className="h-11 w-full rounded-full border-dashed border-violet-300 bg-white text-violet-700 hover:bg-violet-50"
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
