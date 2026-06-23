"use client";

import {
  expandCalendarSlotToSteps,
  utcWeeklySlotsToCalendarInstances,
} from "@mezon-tutors/shared";
import { useMemo } from "react";
import type { ScheduleSlotInput } from "@/components/common/ScheduleSelection";
import { getWeekStartMondayInTimezone } from "@/lib/timezone";
import {
  computeBlockedWallClockSlots,
  partitionOccupiedSlotsByHold,
} from "@/lib/schedule-slot-occupancy";
import {
  useGetOccupiedTrialLessonSlotsForWeek,
  useGetStudentOccupiedSlotsForWeek,
  useGetTutorAvailability,
} from "@/services";

const DAYS_IN_WEEK = 7;
const SLOT_INTERVAL_MINUTES = 30;

type UseTutorScheduleGridOptions = {
  tutorId: string;
  duration: number;
  weekOffset: number;
  enabled: boolean;
  userTimezone: string;
  isAuthenticated: boolean;
  includeOccupiedBlocking: boolean;
};

export function useTutorScheduleGrid({
  tutorId,
  duration,
  weekOffset,
  enabled,
  userTimezone,
  isAuthenticated,
  includeOccupiedBlocking,
}: UseTutorScheduleGridOptions) {
  const { data: schedule, isPending: isAvailabilityPending } =
    useGetTutorAvailability(tutorId, enabled && Boolean(tutorId));

  const baseWeekStart = useMemo(
    () => getWeekStartMondayInTimezone(userTimezone),
    [userTimezone],
  );

  const weekStartYmd = useMemo(
    () => baseWeekStart.add(weekOffset * DAYS_IN_WEEK, "day").format("YYYY-MM-DD"),
    [baseWeekStart, weekOffset],
  );

  const scheduleAvailableSlots = useMemo<ScheduleSlotInput[]>(() => {
    const rows = schedule?.availability ?? [];
    const calendarInstances = utcWeeklySlotsToCalendarInstances(
      rows.map((slot) => ({
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
        isActive: slot.isActive,
      })),
      userTimezone,
      weekOffset,
    );

    return calendarInstances.flatMap((instance) =>
      expandCalendarSlotToSteps(instance, SLOT_INTERVAL_MINUTES, duration),
    );
  }, [schedule?.availability, userTimezone, weekOffset, duration]);

  const occupiedEnabled =
    enabled && includeOccupiedBlocking && Boolean(tutorId);

  const {
    data: occupiedWeekResponse,
    isFetching: isOccupiedWeekFetching,
    isSuccess: isOccupiedWeekReady,
    isError: isOccupiedWeekError,
  } = useGetOccupiedTrialLessonSlotsForWeek(
    tutorId,
    weekStartYmd,
    userTimezone,
    occupiedEnabled,
  );

  const {
    data: studentOccupiedWeekResponse,
    isFetching: isStudentOccupiedWeekFetching,
    isSuccess: isStudentOccupiedWeekReady,
    isError: isStudentOccupiedWeekError,
  } = useGetStudentOccupiedSlotsForWeek(
    weekStartYmd,
    userTimezone,
    occupiedEnabled && isAuthenticated,
  );

  const occupiedWeekItems = occupiedWeekResponse?.items ?? [];
  const studentOccupiedWeekItems = studentOccupiedWeekResponse?.items ?? [];

  const { confirmed: occupiedConfirmed, held: occupiedHeld } = useMemo(
    () => partitionOccupiedSlotsByHold(occupiedWeekItems),
    [occupiedWeekItems],
  );

  const { confirmed: studentOccupiedConfirmed, held: studentOccupiedHeld } =
    useMemo(
      () => partitionOccupiedSlotsByHold(studentOccupiedWeekItems),
      [studentOccupiedWeekItems],
    );

  const occupiedForBlocking = useMemo(
    () => [...occupiedConfirmed, ...studentOccupiedConfirmed],
    [occupiedConfirmed, studentOccupiedConfirmed],
  );

  const occupiedHeldForBlocking = useMemo(
    () => [...occupiedHeld, ...studentOccupiedHeld],
    [occupiedHeld, studentOccupiedHeld],
  );

  const occupiedDataReady =
    !includeOccupiedBlocking ||
    ((isOccupiedWeekReady || isOccupiedWeekError) &&
      (!isAuthenticated || isStudentOccupiedWeekReady || isStudentOccupiedWeekError));

  const scheduleBlockedSlots = useMemo(() => {
    if (!includeOccupiedBlocking || !occupiedDataReady) {
      return [];
    }
    return computeBlockedWallClockSlots(
      scheduleAvailableSlots,
      duration,
      userTimezone,
      { occupied: occupiedForBlocking },
    );
  }, [
    scheduleAvailableSlots,
    duration,
    userTimezone,
    occupiedForBlocking,
    includeOccupiedBlocking,
    occupiedDataReady,
  ]);

  const scheduleHeldSlots = useMemo(() => {
    if (!includeOccupiedBlocking || !occupiedDataReady) {
      return [];
    }
    return computeBlockedWallClockSlots(
      scheduleAvailableSlots,
      duration,
      userTimezone,
      { occupied: occupiedHeldForBlocking },
    );
  }, [
    scheduleAvailableSlots,
    duration,
    userTimezone,
    occupiedHeldForBlocking,
    includeOccupiedBlocking,
    occupiedDataReady,
  ]);

  const isOccupiedDataLoading =
    includeOccupiedBlocking &&
    ((!isOccupiedWeekReady && isOccupiedWeekFetching) ||
      (isAuthenticated &&
        !isStudentOccupiedWeekReady &&
        isStudentOccupiedWeekFetching));

  const hasAvailability =
    (schedule?.availability ?? []).some((slot) => slot.isActive) ?? false;

  return {
    scheduleAvailableSlots,
    scheduleBlockedSlots,
    scheduleHeldSlots,
    isAvailabilityPending,
    isOccupiedDataLoading,
    hasAvailability,
  };
}
