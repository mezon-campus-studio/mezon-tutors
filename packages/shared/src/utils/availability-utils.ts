import { DAY_KEYS } from '../constants/tutor-profile';
import type {
  TimeSlot,
  TutorProfileAvailabilityState,
} from '../types/tutor-profile';
import { timeToMinutes } from './date-time';
import {
  normalizeUtcAvailabilityRowsForStorage,
  utcWeeklySlotsToTimezone,
  weeklySlotsInTimezoneToUtc,
} from './tutor-availability-utc';

export type UtcAvailabilityRow = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

type ApiAvailabilityRow = UtcAvailabilityRow & {
  isActive?: boolean | null;
};

export function normalizeUtcAvailabilityRows(rows: ApiAvailabilityRow[]): UtcAvailabilityRow[] {
  return rows
    .filter((row) => row.isActive !== false)
    .map(({ dayOfWeek, startTime, endTime }) => ({
      dayOfWeek,
      startTime,
      endTime,
    }));
}

export function emptySlotsByDay(): Record<string, TimeSlot[]> {
  return Object.fromEntries(DAY_KEYS.map((d) => [d, []]));
}

function hasAnySlotInRecord(slotsByDay: Record<string, TimeSlot[]>): boolean {
  return DAY_KEYS.some((day) => (slotsByDay[day] ?? []).length > 0);
}

export function readAvailabilityDraftToLocalSlots(
  draft: Pick<TutorProfileAvailabilityState, 'utcAvailability' | 'slotsByDay'>,
  timezone: string,
): Record<string, TimeSlot[]> {
  const utcRows = normalizeUtcAvailabilityRows(draft.utcAvailability ?? []);
  if (utcRows.length > 0) {
    return availabilityToSlotsByDay(utcRows, timezone);
  }

  const legacy = draft.slotsByDay;
  if (legacy && hasAnySlotInRecord(legacy)) {
    return legacy;
  }

  return emptySlotsByDay();
}

export function writeLocalSlotsToAvailabilityDraftUtc(
  slotsByDay: Record<string, TimeSlot[]>,
  timezone: string,
): UtcAvailabilityRow[] {
  return slotsByDayToUtcAvailability(slotsByDay, timezone);
}

function dedupeDaySlots(slots: TimeSlot[]): TimeSlot[] {
  const seen = new Set<string>();
  const out: TimeSlot[] = [];
  for (const slot of slots) {
    const key = `${slot.startTime}-${slot.endTime}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(slot);
  }
  return out;
}

export function availabilityToSlotsByDay(
  availability: ApiAvailabilityRow[],
  timezone: string,
): Record<string, TimeSlot[]> {
  const slotsByDay = emptySlotsByDay();
  const rows = normalizeUtcAvailabilityRows(availability);
  if (!rows.length) {
    return slotsByDay;
  }

  const localSlots = utcWeeklySlotsToTimezone(
    rows.map((slot) => ({
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      isActive: true,
    })),
    timezone,
  );

  for (const slot of localSlots) {
    const dayKey = DAY_KEYS[slot.dayOfWeek];
    if (dayKey) {
      slotsByDay[dayKey].push({
        startTime: slot.startTime,
        endTime: slot.endTime,
      });
    }
  }

  for (const day of DAY_KEYS) {
    slotsByDay[day] = dedupeDaySlots(slotsByDay[day] ?? []);
  }

  return slotsByDay;
}

export function slotsByDayToUtcAvailability(
  slotsByDay: Record<string, TimeSlot[]>,
  timezone: string,
): UtcAvailabilityRow[] {
  const localAvailability: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }> = [];

  Object.entries(slotsByDay).forEach(([dayKey, slots]) => {
    const dayIndex = DAY_KEYS.indexOf(dayKey as (typeof DAY_KEYS)[number]);
    if (dayIndex === -1) return;
    for (const slot of slots) {
      if (slot.startTime && slot.endTime) {
        localAvailability.push({
          dayOfWeek: dayIndex,
          startTime: slot.startTime,
          endTime: slot.endTime,
        });
      }
    }
  });

  const utcSlots = weeklySlotsInTimezoneToUtc(
    localAvailability.map((s) => ({ ...s, isActive: true })),
    timezone,
  );

  return normalizeUtcAvailabilityRowsForStorage(utcSlots).map(({ dayOfWeek, startTime, endTime }) => ({
    dayOfWeek,
    startTime,
    endTime,
  }));
}

type ValidateSlotsMessages = {
  weeklySlotsRequired: string;
  timeRequired: string;
  minuteStepInvalid: string;
  endTimeMustBeAfterStartTime: string;
  duplicateSlot: (day: string) => string;
  overlappingSlot: (day: string) => string;
  dayLabel: (dayIndex: number) => string;
};

export function validateWeeklySlots(
  slotsByDay: Record<string, TimeSlot[]>,
  messages: ValidateSlotsMessages,
): string | null {
  const hasAnySlot = DAY_KEYS.some((day) => (slotsByDay[day] ?? []).length > 0);
  if (!hasAnySlot) {
    return messages.weeklySlotsRequired;
  }

  for (const day of DAY_KEYS) {
    const daySlots = slotsByDay[day] ?? [];
    const dayLabel = messages.dayLabel(DAY_KEYS.indexOf(day));

    for (let i = 0; i < daySlots.length; i++) {
      const slot = daySlots[i];
      if (!slot.startTime || !slot.endTime) {
        return messages.timeRequired;
      }

      const startMinutes = timeToMinutes(slot.startTime);
      const endMinutes = timeToMinutes(slot.endTime);
      const [, startMinute = ''] = slot.startTime.split(':');
      const [, endMinute = ''] = slot.endTime.split(':');

      if (!['00', '30'].includes(startMinute) || !['00', '30'].includes(endMinute)) {
        return messages.minuteStepInvalid;
      }

      if (startMinutes >= endMinutes) {
        return messages.endTimeMustBeAfterStartTime;
      }

      for (let j = i + 1; j < daySlots.length; j++) {
        const otherSlot = daySlots[j];
        const otherStartMinutes = timeToMinutes(otherSlot.startTime);
        const otherEndMinutes = timeToMinutes(otherSlot.endTime);

        if (slot.startTime === otherSlot.startTime && slot.endTime === otherSlot.endTime) {
          return messages.duplicateSlot(dayLabel);
        }

        const isOverlapping = startMinutes < otherEndMinutes && endMinutes > otherStartMinutes;
        if (isOverlapping) {
          return messages.overlappingSlot(dayLabel);
        }
      }
    }
  }

  return null;
}
