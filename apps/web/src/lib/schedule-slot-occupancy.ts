import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { nowInTimezone, parseYmdInTimezone } from "@/lib/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

export type OccupiedSlotItem = { startAt: string; durationMinutes: number };

export type WallClockSlot = {
  date: string;
  startTime: string;
  endTime?: string;
};

export function slotOverlapsOccupied(
  date: string,
  startTime: string,
  durationMinutes: number,
  occupied: OccupiedSlotItem[],
  timezoneName: string,
): boolean {
  if (!occupied.length) {
    return false;
  }

  const slotStartLocal = dayjs.tz(`${date} ${startTime}`, timezoneName);
  if (!slotStartLocal.isValid()) {
    return false;
  }
  const slotEndLocal = slotStartLocal.add(durationMinutes, "minute");

  return occupied.some((booked) => {
    const bookedStart = dayjs.utc(booked.startAt);
    if (!bookedStart.isValid()) {
      return false;
    }
    const bookedEnd = bookedStart.add(booked.durationMinutes, "minute");
    return (
      slotStartLocal.utc().isBefore(bookedEnd) &&
      slotEndLocal.utc().isAfter(bookedStart)
    );
  });
}

export function isSlotWithinLeadTimeHours(
  date: string,
  startTime: string,
  timezoneName: string,
  minHoursFromNow: number,
): boolean {
  const slotStart = dayjs.tz(`${date} ${startTime}`, timezoneName);
  if (!slotStart.isValid()) {
    return true;
  }
  const hoursUntil = slotStart.diff(nowInTimezone(timezoneName), "hour", true);
  return hoursUntil <= minHoursFromNow;
}

/** Candidate availability slots that cannot be selected (occupied, lead time, etc.). */
export function computeBlockedWallClockSlots(
  candidates: WallClockSlot[],
  durationMinutes: number,
  timezoneName: string,
  options: {
    occupied?: OccupiedSlotItem[];
    minHoursFromNow?: number;
  },
): WallClockSlot[] {
  const occupied = options.occupied ?? [];
  const blocked: WallClockSlot[] = [];

  for (const slot of candidates) {
    if (
      options.minHoursFromNow != null &&
      isSlotWithinLeadTimeHours(
        slot.date,
        slot.startTime,
        timezoneName,
        options.minHoursFromNow,
      )
    ) {
      blocked.push(slot);
      continue;
    }
    if (
      slotOverlapsOccupied(
        slot.date,
        slot.startTime,
        durationMinutes,
        occupied,
        timezoneName,
      )
    ) {
      blocked.push(slot);
    }
  }

  return blocked;
}

export function isWallClockSlotSelectable(
  slot: WallClockSlot,
  durationMinutes: number,
  timezoneName: string,
  blocked: WallClockSlot[],
): boolean {
  return !blocked.some(
    (b) => b.date === slot.date && b.startTime === slot.startTime,
  );
}
