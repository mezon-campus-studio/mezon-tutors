"use client";

import {
  ECurrency,
  EPeriod,
  ETrialLessonBookingStatus,
  formatToCurrency,
  jsDayToDbDayOfWeek,
  type TrialTimeSlot,
  timeToMinutes,
  utcWeeklySlotsToCalendarInstances,
  expandCalendarSlotToSteps,
} from "@mezon-tutors/shared";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { useAtomValue } from "jotai";
import { CalendarClock, Clock, Sparkles, XIcon } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ScheduleSelection,
  type SelectedScheduleSlot,
} from "@/components/common/ScheduleSelection";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Separator,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Spinner,
  toast,
} from "@/components/ui";
import { useCurrency, useUserTimezone } from "@/hooks";
import {
  formatWallClockTime12h,
  getWeekStartMondayInTimezone,
  parseYmdInTimezone,
  startOfTodayInTimezone,
} from "@/lib/timezone";
import {
  useGetAlreadyBookedTrialLesson,
  useGetOccupiedTrialLessonSlotsForWeek,
  useGetStudentOccupiedSlotsForWeek,
  useGetTutorAvailability,
  usePublicAppSettings,
} from "@/services";
import {
  computeBlockedWallClockSlots,
  partitionOccupiedSlotsByHold,
} from "@/lib/schedule-slot-occupancy";
import { isAuthenticatedAtom } from "@/store/auth.atom";
import DEFAULT_AVATAR from '@/public/images/default-avatar.png';

dayjs.extend(utc);
dayjs.extend(timezone);

function parseTimeParts(hhmm: string): { hour: number; minute: number } {
  const [h, m] = hhmm.split(":").map(Number);
  return { hour: h ?? 0, minute: m ?? 0 };
}

function periodFromHourMinute(hour: number): EPeriod {
  if (hour >= 1 && hour < 11) return EPeriod.MORNING;
  if (hour >= 11 && hour < 13) return EPeriod.NOON;
  if (hour >= 13 && hour < 17) return EPeriod.AFTERNOON;
  return EPeriod.EVENING;
}

export type TrialBookingPayload = {
  duration: number;
  startAt: string;
  dayOfWeek: number;
  time: TrialTimeSlot;
};

export type TrialBookingSheetMode = "book" | "reschedule";

export interface TrialBookingSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: TrialBookingSheetMode;
  /** When rescheduling, exclude this booking from occupied API (other students still blocked). */
  rescheduleBookingId?: string;
  /** UTC ISO start of the lesson being moved; hidden from the grid while rescheduling. */
  rescheduleOriginalStartAt?: string;
  initialDurationMinutes?: number;
  lockDuration?: boolean;
  onConfirm?: (payload: TrialBookingPayload) => void | Promise<void>;
  tutor: {
    id: string;
    name: string;
    title: string;
    prices: {
      baseCurrency: ECurrency;
      usd: number;
      vnd: number;
      php: number;
    };
    avatar: string;
  };
}

const DURATION_OPTIONS = [30, 60];
const DAYS_IN_WEEK = 7;
const SLOT_INTERVAL_MINUTES = 30;

function capitalizeFirstLetter(value: string): string {
  if (!value) {
    return value;
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatLocalizedLessonTimeLabel(
  start: dayjs.Dayjs,
  endTime: string,
  locale: string,
): string {
  const timeRange = `${start.format("HH:mm")} - ${endTime}`;
  const weekday = capitalizeFirstLetter(start.format("dddd"));
  const dateLabel = start.format("DD/MM");

  if (locale.startsWith("vi")) {
    return `${weekday}, ngày ${dateLabel} : ${timeRange}`;
  }

  return `${weekday}, ${dateLabel} : ${timeRange}`;
}

function formatRescheduleConfirmTimeLabel(
  startAtIso: string,
  durationMinutes: number,
  timezoneName: string,
  locale: string,
): string {
  const start = dayjs(startAtIso).tz(timezoneName).locale(locale);
  if (!start.isValid()) {
    return "—";
  }
  const end = start.add(durationMinutes, "minute");
  return formatLocalizedLessonTimeLabel(start, end.format("HH:mm"), locale);
}

export function TrialBookingSheet({
  open,
  onOpenChange,
  mode = "book",
  rescheduleBookingId,
  rescheduleOriginalStartAt,
  initialDurationMinutes,
  lockDuration = false,
  onConfirm,
  tutor,
}: TrialBookingSheetProps) {
  const t = useTranslations("Tutors.TrialBookingSheet");
  const tConfirm = useTranslations("Tutors.TrialBookingSheet.rescheduleConfirmDialog");
  const locale = useLocale();
  const isReschedule = mode === "reschedule";
  const router = useRouter();
  const { currency } = useCurrency();
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);

  const [duration, setDuration] = useState<number>(
    initialDurationMinutes ?? DURATION_OPTIONS[0],
  );
  const [timeId, setTimeId] = useState<string>("");
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<TrialBookingPayload | null>(null);
  const [isSubmittingReschedule, setIsSubmittingReschedule] = useState(false);

  const { data: schedule, isPending: isAvailabilityPending } =
    useGetTutorAvailability(tutor.id, open && Boolean(tutor.id));
  const userTimezone = useUserTimezone();
  const { data: publicAppSettings } = usePublicAppSettings();
  const lessonChangePeriodHours = publicAppSettings?.lessonChangePeriodHours;

  const baseWeekStart = useMemo(
    () => getWeekStartMondayInTimezone(userTimezone),
    [userTimezone],
  );

  const calendarDates = useMemo(() => {
    const todayStart = startOfTodayInTimezone(userTimezone);
    const startOfWeek = baseWeekStart.add(weekOffset * DAYS_IN_WEEK, "day");

    return Array.from({ length: DAYS_IN_WEEK }).map((_, index) => {
      const date = startOfWeek.add(index, "day");
      const isPastDate = date.isBefore(todayStart, "day");

      return {
        id: date.format("YYYY-MM-DD"),
        day: date.date(),
        disabled: isPastDate,
      };
    });
  }, [baseWeekStart, userTimezone, weekOffset]);

  const [dateId, setDateId] = useState<string>(() => {
    const firstAvailableDate = calendarDates.find((option) => !option.disabled);
    return firstAvailableDate?.id ?? calendarDates[0]?.id ?? "";
  });

  const selectedDate = useMemo(
    () =>
      calendarDates.find((option) => option.id === dateId) ?? calendarDates[0],
    [calendarDates, dateId],
  );

  const selectedDateString = selectedDate?.id ?? "";

  const dbDayOfWeek = useMemo(() => {
    if (!selectedDateString) return 0;
    return jsDayToDbDayOfWeek(
      parseYmdInTimezone(selectedDateString, userTimezone).day(),
    );
  }, [selectedDateString, userTimezone]);
  const shiftedSlots = useMemo(() => {
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

  const weekStartYmd = useMemo(
    () => baseWeekStart.add(weekOffset * DAYS_IN_WEEK, "day").format("YYYY-MM-DD"),
    [baseWeekStart, weekOffset],
  );

  const scheduleAvailableSlots = useMemo(() => {
    return shiftedSlots.map((slot) => ({
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
    }));
  }, [shiftedSlots]);

  const {
    data: occupiedWeekResponse,
    isFetching: isOccupiedWeekFetching,
    isSuccess: isOccupiedWeekReady,
    isError: isOccupiedWeekError,
  } = useGetOccupiedTrialLessonSlotsForWeek(
    tutor.id,
    weekStartYmd,
    userTimezone,
    open && Boolean(tutor.id),
    isReschedule ? rescheduleBookingId : undefined,
  );

  const {
    data: studentOccupiedWeekResponse,
    isFetching: isStudentOccupiedWeekFetching,
    isSuccess: isStudentOccupiedWeekReady,
    isError: isStudentOccupiedWeekError,
  } = useGetStudentOccupiedSlotsForWeek(
    weekStartYmd,
    userTimezone,
    open && isAuthenticated,
    isReschedule && rescheduleBookingId
      ? { excludeBookingId: rescheduleBookingId }
      : undefined,
  );

  const occupiedWeekItems = occupiedWeekResponse?.items ?? [];
  const studentOccupiedWeekItems = studentOccupiedWeekResponse?.items ?? [];

  const ownLessonOccupied = useMemo(() => {
    if (!isReschedule || !rescheduleOriginalStartAt) {
      return [];
    }
    return [
      {
        startAt: rescheduleOriginalStartAt,
        durationMinutes: initialDurationMinutes ?? duration,
      },
    ];
  }, [isReschedule, rescheduleOriginalStartAt, initialDurationMinutes, duration]);

  const { confirmed: occupiedConfirmed, held: occupiedHeld } = useMemo(
    () => partitionOccupiedSlotsByHold(occupiedWeekItems),
    [occupiedWeekItems],
  );

  const {
    confirmed: studentOccupiedConfirmed,
    held: studentOccupiedHeld,
  } = useMemo(
    () => partitionOccupiedSlotsByHold(studentOccupiedWeekItems),
    [studentOccupiedWeekItems],
  );

  const occupiedForBlocking = useMemo(
    () => [...occupiedConfirmed, ...studentOccupiedConfirmed, ...ownLessonOccupied],
    [occupiedConfirmed, studentOccupiedConfirmed, ownLessonOccupied],
  );

  const occupiedHeldForBlocking = useMemo(
    () => [...occupiedHeld, ...studentOccupiedHeld],
    [occupiedHeld, studentOccupiedHeld],
  );

  const occupiedDataReady =
    (isOccupiedWeekReady || isOccupiedWeekError) &&
    (!isAuthenticated || isStudentOccupiedWeekReady || isStudentOccupiedWeekError);

  const scheduleBlockedSlots = useMemo(() => {
    if (!occupiedDataReady) {
      return [];
    }
    return computeBlockedWallClockSlots(
      scheduleAvailableSlots,
      duration,
      userTimezone,
      {
        occupied: occupiedForBlocking,
        minHoursFromNow: isReschedule ? lessonChangePeriodHours : undefined,
      },
    );
  }, [
    scheduleAvailableSlots,
    duration,
    userTimezone,
    occupiedForBlocking,
    isReschedule,
    occupiedDataReady,
    lessonChangePeriodHours,
  ]);

  const scheduleHeldSlots = useMemo(() => {
    if (!occupiedDataReady) {
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
    occupiedDataReady,
  ]);

  const scheduleSelectableSlots = useMemo(() => {
    const blockedKeys = new Set([
      ...scheduleBlockedSlots.map((s) => `${s.date}|${s.startTime}`),
      ...scheduleHeldSlots.map((s) => `${s.date}|${s.startTime}`),
    ]);
    return scheduleAvailableSlots.filter(
      (s) => !blockedKeys.has(`${s.date}|${s.startTime}`),
    );
  }, [scheduleAvailableSlots, scheduleBlockedSlots, scheduleHeldSlots]);

  const timeSlots = useMemo(() => {
    const matching = scheduleSelectableSlots.filter(
      (slot) => slot.date === selectedDateString,
    );

    return matching.map((slot) => {
      const { hour } = parseTimeParts(slot.startTime);
      return {
        id: slot.startTime,
        label: formatWallClockTime12h(slot.startTime),
        period: periodFromHourMinute(hour),
        startTime: slot.startTime,
      };
    });
  }, [scheduleSelectableSlots, selectedDateString]);

  const { data: alreadyBookedResponse } = useGetAlreadyBookedTrialLesson(
    tutor.id,
    open && Boolean(tutor.id) && isAuthenticated && !isReschedule,
  );
  const alreadyBookedStatus = alreadyBookedResponse?.status ?? null;
  const hasBooked = Boolean(alreadyBookedResponse?.hasBooked);
  const isBookingLocked =
    !isReschedule &&
    Boolean(
      hasBooked &&
        alreadyBookedStatus &&
        alreadyBookedStatus !== ETrialLessonBookingStatus.CANCELLED,
    );

  const selectedTime = useMemo(
    () => timeSlots.find((slot) => slot.id === timeId),
    [timeSlots, timeId],
  );

  const confirmButtonLabel = useMemo(() => {
    if (!selectedTime) {
      return t("selectScheduleFirst");
    }
    if (alreadyBookedStatus === ETrialLessonBookingStatus.PENDING) {
      return t("requestSentWait");
    }
    if (alreadyBookedStatus === ETrialLessonBookingStatus.CONFIRMED) {
      return t("alreadyBookedConfirmed");
    }
    if (alreadyBookedStatus === ETrialLessonBookingStatus.COMPLETED) {
      return t("alreadyBookedCompleted");
    }
    if (isReschedule) {
      return t("confirmReschedule");
    }
    return t("confirmBooking");
  }, [alreadyBookedStatus, isReschedule, selectedTime, t]);

  useEffect(() => {
    if (open && initialDurationMinutes) {
      setDuration(initialDurationMinutes);
    }
  }, [open, initialDurationMinutes]);

  useEffect(() => {
    if (!open) {
      setConfirmDialogOpen(false);
      setPendingPayload(null);
      setIsSubmittingReschedule(false);
    }
  }, [open]);

  useEffect(() => {
    if (!timeId || !selectedDateString) {
      return;
    }
    const stillSelectable = scheduleSelectableSlots.some(
      (slot) =>
        slot.date === selectedDateString && slot.startTime === timeId,
    );
    if (!stillSelectable) {
      setTimeId("");
    }
  }, [scheduleSelectableSlots, selectedDateString, timeId]);

  useEffect(() => {
    const currentOption = calendarDates.find((option) => option.id === dateId);
    if (!currentOption || currentOption.disabled) {
      const firstAvailableDate = calendarDates.find(
        (option) => !option.disabled,
      );
      if (firstAvailableDate) {
        setDateId(firstAvailableDate.id);
      }
    }
  }, [calendarDates, dateId]);

  const lessonPrice = useMemo(() => {
    if (currency === ECurrency.USD) return tutor.prices.usd;
    if (currency === ECurrency.PHP) return tutor.prices.php;
    return tutor.prices.vnd;
  }, [currency, tutor.prices.php, tutor.prices.usd, tutor.prices.vnd]);
  const selectedDurationIndex = Math.max(0, DURATION_OPTIONS.indexOf(duration));

  const totalPrice = useMemo(
    () => (duration / 60) * lessonPrice,
    [duration, lessonPrice],
  );

  const selectedScheduleSlots = useMemo(() => {
    if (!selectedTime) {
      return [];
    }

    const endMinutes = timeToMinutes(selectedTime.startTime) + duration;
    const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(
      endMinutes % 60,
    ).padStart(2, "0")}`;

    return [
      {
        date: selectedDateString,
        startTime: selectedTime.startTime,
        endTime,
        label: `${selectedDateString} . ${selectedTime.startTime} - ${endTime}`,
      },
    ];
  }, [duration, selectedDateString, selectedTime]);

  const handleScheduleSelectionChange = (slots: SelectedScheduleSlot[]) => {
    const selected = slots[0];
    if (!selected) {
      setTimeId("");
      return;
    }

    setDateId(selected.date);
    setTimeId(selected.startTime);
  };

  const footerTimeLabel = useMemo(() => {
    if (!selectedTime) {
      return t("noTimeSet");
    }
    const start = dayjs
      .tz(`${selectedDateString} ${selectedTime.startTime}`, userTimezone)
      .locale(locale);
    if (!start.isValid()) {
      return t("noTimeSet");
    }
    const endMinutes = timeToMinutes(selectedTime.startTime) + duration;
    const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(
      endMinutes % 60,
    ).padStart(2, "0")}`;
    return formatLocalizedLessonTimeLabel(start, endTime, locale);
  }, [duration, locale, selectedDateString, selectedTime, t, userTimezone]);

  const buildPayload = (): TrialBookingPayload | null => {
    if (!selectedTime) {
      return null;
    }

    const startAt = dayjs(`${selectedDateString} ${selectedTime.startTime}`)
      .tz(userTimezone, true)
      .utc()
      .format();

    return {
      duration,
      startAt,
      dayOfWeek: dbDayOfWeek,
      time: selectedTime as TrialTimeSlot,
    };
  };

  const originalTimeLabel = useMemo(() => {
    if (!rescheduleOriginalStartAt) {
      return "—";
    }
    return formatRescheduleConfirmTimeLabel(
      rescheduleOriginalStartAt,
      initialDurationMinutes ?? duration,
      userTimezone,
      locale,
    );
  }, [
    rescheduleOriginalStartAt,
    initialDurationMinutes,
    duration,
    userTimezone,
    locale,
  ]);

  const pendingNewTimeLabel = useMemo(() => {
    if (!pendingPayload) {
      return "—";
    }
    return formatRescheduleConfirmTimeLabel(
      pendingPayload.startAt,
      pendingPayload.duration,
      userTimezone,
      locale,
    );
  }, [pendingPayload, userTimezone, locale]);

  const handleConfirm = async () => {
    if (!selectedTime || isBookingLocked) {
      return;
    }
    if (!isAuthenticated) {
      toast.error(t("loginRequiredTitle"), {
        description: t("loginRequiredDescription"),
      });
      return;
    }

    const payload = buildPayload();
    if (!payload) {
      return;
    }

    if (isReschedule && onConfirm) {
      setPendingPayload(payload);
      setConfirmDialogOpen(true);
      return;
    }

    if (onConfirm) {
      await onConfirm(payload);
      return;
    }

    const query = new URLSearchParams({
      tutorId: tutor.id,
      startAt: payload.startAt,
      durationMinutes: String(payload.duration),
      dayOfWeek: String(payload.dayOfWeek),
      timezone: userTimezone,
    });
    onOpenChange(false);
    router.push(`/checkout/trial-lesson?${query.toString()}`);
  };

  const handleConfirmReschedule = async () => {
    if (!pendingPayload || !onConfirm) {
      return;
    }

    try {
      setIsSubmittingReschedule(true);
      await onConfirm(pendingPayload);
      setConfirmDialogOpen(false);
      setPendingPayload(null);
      onOpenChange(false);
    } catch {
      // Parent shows error toast; keep dialog open for retry.
    } finally {
      setIsSubmittingReschedule(false);
    }
  };

  const isConfirmDisabled =
    isAvailabilityPending ||
    isBookingLocked ||
    !selectedTime ||
    (isOccupiedWeekFetching && !isOccupiedWeekReady && !isOccupiedWeekError) ||
    (isAuthenticated &&
      isStudentOccupiedWeekFetching &&
      !isStudentOccupiedWeekReady &&
      !isStudentOccupiedWeekError);

  const isOccupiedDataLoading =
    (!isOccupiedWeekReady && isOccupiedWeekFetching) ||
    (isAuthenticated &&
      !isStudentOccupiedWeekReady &&
      isStudentOccupiedWeekFetching);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="mx-auto flex h-[92vh]! max-h-screen w-full flex-col gap-0 overflow-hidden rounded-t-3xl border-violet-100 bg-white p-0 shadow-2xl shadow-violet-300/30"
      >
        <SheetHeader className="shrink-0 flex-row items-center justify-between gap-3 border-b border-violet-100 bg-[linear-gradient(180deg,#faf7ff_0%,#ffffff_100%)] px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="hidden size-10 shrink-0 items-center justify-center rounded-2xl bg-brand-gradient-135 text-white shadow-md shadow-violet-300/40 sm:flex">
              <Sparkles className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="hidden text-[10px] font-bold uppercase tracking-[0.18em] text-violet-500 sm:block">
                Trial lesson
              </p>
              <SheetTitle className="min-w-0 truncate text-left text-base font-extrabold text-slate-900 sm:text-lg md:text-xl">
                <span className="text-brand-gradient">
                  {isReschedule ? t("rescheduleTitle") : t("title")}
                </span>
              </SheetTitle>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-9 shrink-0 rounded-full hover:bg-slate-100"
            onClick={() => onOpenChange(false)}
          >
            <XIcon className="size-5" />
          </Button>
        </SheetHeader>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
          <div className="relative flex min-h-0 min-w-0 flex-1 flex-col px-3 pt-4 sm:px-6">
            {isOccupiedDataLoading ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/70 backdrop-blur-[1px]">
                <Spinner className="size-8 text-violet-600" />
              </div>
            ) : null}
            <ScheduleSelection
              fillAvailableHeight
              className="min-h-0 flex-1"
              availableSlots={scheduleAvailableSlots}
              blockedSlots={scheduleBlockedSlots}
              heldSlots={scheduleHeldSlots}
              timezone={userTimezone}
              selectionMode="single"
              lessonDurationMinutes={duration}
              value={selectedScheduleSlots}
              onChange={handleScheduleSelectionChange}
              onWeekChange={useCallback(
                ({ weekOffset: nextWeekOffset }: { weekOffset: number }) => {
                  setWeekOffset(nextWeekOffset);
                },
                [],
              )}
            />
          </div>

          <Separator className="shrink-0 bg-violet-100" />

          <div className="shrink-0 bg-[linear-gradient(180deg,#ffffff_0%,#faf7ff_100%)] px-3 py-3 sm:px-6 sm:py-4">
            <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
              <div
                className={`flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center ${
                  isReschedule ? "sm:flex-nowrap sm:gap-2" : "sm:flex-wrap"
                }`}
              >
                <div
                  className={`flex min-w-0 items-center gap-3 ${
                    isReschedule ? "shrink sm:max-w-[9.5rem] md:max-w-[11rem] lg:max-w-[13rem]" : ""
                  }`}
                >
                  <Image
                    src={tutor.avatar || DEFAULT_AVATAR}
                    alt={tutor.name}
                    width={56}
                    height={56}
                    className={`shrink-0 rounded-2xl object-cover ring-2 ring-white shadow-sm shadow-violet-200/40 ${
                      isReschedule ? "size-10 sm:size-11" : "size-12 sm:size-14"
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-base font-extrabold text-slate-900 sm:text-lg">
                      {tutor.name}
                    </p>
                    <p className="truncate text-xs text-slate-500 sm:text-sm">
                      <span className="font-medium text-slate-700">
                        {t("expertTutorTitle", { subject: tutor.title })}
                      </span>
                      <span className="mx-1.5 text-slate-300">·</span>
                      <span className="font-bold text-violet-700">
                        {formatToCurrency(currency, lessonPrice)}
                        {t("perHour")}
                      </span>
                    </p>
                  </div>
                </div>

                <div
                  className={`relative inline-flex w-full max-w-full shrink-0 items-center rounded-full border border-violet-100 bg-white p-1 sm:w-auto ${
                    lockDuration ? "pointer-events-none opacity-60" : ""
                  } ${isReschedule ? "sm:shrink-0" : ""}`}
                >
                  <span
                    aria-hidden
                    className="absolute bottom-1 left-1 top-1 rounded-full bg-brand-gradient shadow-sm shadow-violet-300/40 transition-transform duration-300 ease-out"
                    style={{
                      width: `calc((100% - 0.5rem) / ${DURATION_OPTIONS.length})`,
                      transform: `translateX(${selectedDurationIndex * 100}%)`,
                    }}
                  />
                  {DURATION_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`relative z-10 inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors duration-200 sm:flex-none sm:px-4 sm:py-2 sm:text-sm ${
                        duration === option
                          ? "text-white"
                          : "text-slate-500 hover:text-violet-700"
                      }`}
                      onClick={() => setDuration(option)}
                    >
                      <Clock className="size-3.5" />
                      {t("durationMins", { value: option })}
                    </button>
                  ))}
                </div>

                <div
                  className={
                    isReschedule ? "flex w-full justify-center sm:contents" : undefined
                  }
                >
                  <span
                    className={`inline-flex min-w-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-semibold transition-colors sm:px-3 sm:py-2 sm:text-xs ${
                      isReschedule
                        ? "w-auto max-w-[17rem] shrink sm:max-w-[15rem] md:max-w-[18rem]"
                        : "w-full max-w-full sm:w-auto sm:px-4 sm:text-sm"
                    } ${
                      selectedTime
                        ? "bg-[linear-gradient(110deg,#faf5ff,#fdf2f8)] text-violet-700 ring-1 ring-violet-200"
                        : "bg-slate-50 text-slate-500 ring-1 ring-slate-200"
                    }`}
                  >
                    <CalendarClock
                      className={`size-3.5 shrink-0 ${selectedTime ? "text-violet-600" : "text-slate-400"}`}
                    />
                    <span className="min-w-0 truncate">{footerTimeLabel}</span>
                    {selectedTime ? (
                      <button
                        type="button"
                        className="ml-0.5 flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full bg-violet-100 text-violet-600 transition-colors hover:bg-violet-200"
                        onClick={() => setTimeId("")}
                        aria-label={t("clearSelectedTime")}
                      >
                        <XIcon className="size-3" />
                      </button>
                    ) : null}
                  </span>
                </div>
              </div>

              <div
                className={`flex w-full min-w-0 flex-col items-stretch gap-3 sm:flex-row sm:items-center lg:w-auto lg:shrink-0 ${
                  isReschedule
                    ? "sm:justify-end sm:gap-2"
                    : "sm:justify-between lg:justify-end"
                }`}
              >
                {!isReschedule ? (
                  <div className="flex flex-col items-start sm:items-end">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                      Total
                    </p>
                    <p className="text-brand-gradient text-2xl font-extrabold leading-none tracking-tight sm:text-3xl">
                      {formatToCurrency(currency, totalPrice)}
                    </p>
                  </div>
                ) : (
                  <p className="w-full text-xs leading-relaxed text-slate-500 sm:max-w-[7.5rem] sm:shrink-0 sm:text-[11px] md:max-w-[8.5rem] lg:line-clamp-3">
                    {t("rescheduleHint")}
                  </p>
                )}
                <Button
                  size="lg"
                  className="group h-11 w-full min-w-0 rounded-full bg-brand-gradient px-6 text-sm font-semibold text-white shadow-md shadow-violet-300/40 transition-all hover:shadow-lg hover:shadow-violet-400/50 disabled:bg-slate-200 disabled:bg-none disabled:text-slate-400 disabled:shadow-none sm:w-auto sm:min-w-32"
                  disabled={isConfirmDisabled}
                  onClick={handleConfirm}
                >
                  <span className="line-clamp-2 text-center">
                    {confirmButtonLabel}
                  </span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>

      <Dialog
        open={confirmDialogOpen}
        onOpenChange={(nextOpen) => {
          if (!isSubmittingReschedule) {
            setConfirmDialogOpen(nextOpen);
            if (!nextOpen) {
              setPendingPayload(null);
            }
          }
        }}
      >
        <DialogContent className="max-w-[460px] gap-0 overflow-hidden border-violet-100 p-0 shadow-xl shadow-violet-200/40">
          <DialogHeader className="border-b border-violet-50 bg-[linear-gradient(180deg,#faf7ff_0%,#ffffff_100%)] px-5 py-4">
            <DialogTitle className="font-heading text-lg font-extrabold text-slate-900">
              {tConfirm("title")}
            </DialogTitle>
            <p className="text-sm leading-relaxed text-slate-500">
              {tConfirm("description")}
            </p>
          </DialogHeader>

          <div className="flex flex-col gap-4 px-6 py-5">
            <div className="flex items-center gap-3 rounded-2xl border border-violet-100 bg-violet-50/40 px-4 py-3">
              <Image
                src={tutor.avatar || DEFAULT_AVATAR}
                alt={tutor.name}
                width={48}
                height={48}
                className="size-12 shrink-0 rounded-xl object-cover ring-2 ring-white shadow-sm"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold text-slate-900">
                  {tutor.name}
                </p>
                <p className="truncate text-xs text-slate-500">{tutor.title}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  {tConfirm("oldTimeLabel")}
                </p>
                <p className="mt-1 text-sm font-bold text-slate-700">
                  {originalTimeLabel}
                </p>
              </div>

              <div className="rounded-2xl border border-violet-200 bg-[linear-gradient(180deg,#faf5ff,#fdf2f8)] px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-violet-500">
                  {tConfirm("newTimeLabel")}
                </p>
                <p className="mt-1 text-sm font-bold text-violet-800">
                  {pendingNewTimeLabel}
                </p>
              </div>
            </div>

            {isSubmittingReschedule ? (
              <div className="flex items-center justify-center gap-2 rounded-2xl border border-violet-100 bg-violet-50/60 px-4 py-3">
                <Spinner className="size-4 text-violet-600" />
                <p className="text-sm font-medium text-violet-700">
                  {tConfirm("submitting")}
                </p>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-violet-50 bg-slate-50/50 px-6 py-5 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full rounded-full border-slate-200 px-6 text-sm font-semibold text-slate-700 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 sm:w-auto"
              disabled={isSubmittingReschedule}
              onClick={() => {
                setConfirmDialogOpen(false);
                setPendingPayload(null);
              }}
            >
              {tConfirm("cancel")}
            </Button>
            <Button
              type="button"
              className="h-11 w-full rounded-full bg-brand-gradient px-6 text-sm font-semibold text-white shadow-md shadow-violet-300/40 hover:shadow-lg hover:shadow-violet-400/50 disabled:opacity-70 sm:w-auto"
              disabled={isSubmittingReschedule}
              onClick={() => void handleConfirmReschedule()}
            >
              {isSubmittingReschedule ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner className="size-4" />
                  {tConfirm("submitting")}
                </span>
              ) : (
                tConfirm("confirm")
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
