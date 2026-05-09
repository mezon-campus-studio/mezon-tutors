'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAtomValue } from 'jotai';
import { useEffect, useMemo, useState } from 'react';
import { XIcon } from 'lucide-react';
import {
  Button,
  Separator,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  toast,
} from '@/components/ui';
import { isAuthenticatedAtom } from '@/store/auth.atom';
import {
  useGetAlreadyBookedTrialLesson,
  useGetOccupiedTrialLessonSlots,
  useGetTutorAvailability,
} from '@/services';
import {
  buildTimeSlotsForDay,
  ECurrency,
  ETrialLessonBookingStatus,
  formatToCurrency,
  jsDayToDbDayOfWeek,
  parseYyyyMmDdToLocalDate,
  timeToMinutes,
  type TrialTimeSlot,
} from '@mezon-tutors/shared';
import {
  ScheduleSelection,
  type SelectedScheduleSlot,
} from '@/components/common/ScheduleSelection';
import { useCurrency } from '@/hooks';

export type TrialBookingPayload = {
  duration: number;
  startAt: string;
  dayOfWeek: number;
  time: TrialTimeSlot;
};

export interface TrialBookingSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export function TrialBookingSheet({
  open,
  onOpenChange,
  onConfirm,
  tutor,
}: TrialBookingSheetProps) {
  const t = useTranslations('Tutors.TrialBookingSheet');
  const router = useRouter();
  const { currency } = useCurrency();
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);

  const [duration, setDuration] = useState<number>(DURATION_OPTIONS[0]);
  const [timeId, setTimeId] = useState<string>('');
  const [nowTs, setNowTs] = useState<number>(Date.now());
  const [weekOffset, setWeekOffset] = useState<number>(0);

  const { data: schedule, isPending: isAvailabilityPending } = useGetTutorAvailability(
    tutor.id,
    open && Boolean(tutor.id)
  );

  const baseWeekStart = useMemo(() => {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const jsWeekDay = todayStart.getDay();
    const distanceToMonday = jsWeekDay === 0 ? 6 : jsWeekDay - 1;
    const startOfCurrentWeek = new Date(todayStart);
    startOfCurrentWeek.setDate(todayStart.getDate() - distanceToMonday);
    return startOfCurrentWeek;
  }, []);

  const calendarDates = useMemo(() => {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfWeek = new Date(baseWeekStart);
    startOfWeek.setDate(baseWeekStart.getDate() + weekOffset * DAYS_IN_WEEK);

    return Array.from({ length: DAYS_IN_WEEK }).map((_, index) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + index);

      const normalized = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const isPastDate = normalized.getTime() < todayStart.getTime();

      return {
        id: `${normalized.getFullYear()}-${normalized.getMonth() + 1}-${normalized.getDate()}`,
        day: normalized.getDate(),
        disabled: isPastDate,
      };
    });
  }, [baseWeekStart, weekOffset]);

  const [dateId, setDateId] = useState<string>(() => {
    const firstAvailableDate = calendarDates.find((option) => !option.disabled);
    return firstAvailableDate?.id ?? calendarDates[0]?.id ?? '';
  });

  const selectedDate = useMemo(
    () => calendarDates.find((option) => option.id === dateId) ?? calendarDates[0],
    [calendarDates, dateId]
  );

  const selectedDateString = useMemo(() => {
    const fullDate = parseYyyyMmDdToLocalDate(selectedDate.id);
    const y = fullDate.getFullYear();
    const m = String(fullDate.getMonth() + 1).padStart(2, '0');
    const d = String(fullDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [selectedDate]);

  const dbDayOfWeek = useMemo(() => {
    const fullDate = parseYyyyMmDdToLocalDate(selectedDate.id);
    return jsDayToDbDayOfWeek(fullDate.getDay());
  }, [selectedDate]);

  const timeSlots = useMemo(() => {
    const rows = schedule?.availability ?? [];
    return buildTimeSlotsForDay(rows, dbDayOfWeek, SLOT_INTERVAL_MINUTES);
  }, [schedule?.availability, dbDayOfWeek]);

  const scheduleAvailableSlots = useMemo(() => {
    const rows = schedule?.availability ?? [];

    return calendarDates.flatMap((dateOption) => {
      const fullDate = parseYyyyMmDdToLocalDate(dateOption.id);
      const y = fullDate.getFullYear();
      const m = String(fullDate.getMonth() + 1).padStart(2, '0');
      const d = String(fullDate.getDate()).padStart(2, '0');
      const dateString = `${y}-${m}-${d}`;
      const dayOfWeek = jsDayToDbDayOfWeek(fullDate.getDay());
      const daySlots = buildTimeSlotsForDay(rows, dayOfWeek, SLOT_INTERVAL_MINUTES);

      return daySlots.map((slot) => ({
        date: dateString,
        startTime: slot.startTime,
      }));
    });
  }, [calendarDates, schedule?.availability]);

  const { data: occupiedSlotsResponse } = useGetOccupiedTrialLessonSlots(
    tutor.id,
    selectedDateString,
    open && Boolean(tutor.id)
  );
  const { data: alreadyBookedResponse, isPending: isAlreadyBookedPending } =
    useGetAlreadyBookedTrialLesson(tutor.id, open && Boolean(tutor.id) && isAuthenticated);
  const alreadyBookedStatus = alreadyBookedResponse?.status ?? null;
  const hasBooked = Boolean(alreadyBookedResponse?.hasBooked);
  const isBookingLocked = Boolean(
    hasBooked && alreadyBookedStatus && alreadyBookedStatus !== ETrialLessonBookingStatus.CANCELLED
  );

  const selectedTime = useMemo(
    () => timeSlots.find((slot) => slot.id === timeId),
    [timeSlots, timeId]
  );

  const confirmButtonLabel = useMemo(() => {
    if (!selectedTime) {
      return t('selectScheduleFirst');
    }
    if (alreadyBookedStatus === ETrialLessonBookingStatus.PENDING) {
      return t('requestSentWait');
    }
    if (alreadyBookedStatus === ETrialLessonBookingStatus.CONFIRMED) {
      return t('alreadyBookedConfirmed');
    }
    if (alreadyBookedStatus === ETrialLessonBookingStatus.COMPLETED) {
      return t('alreadyBookedCompleted');
    }
    return t('confirmBooking');
  }, [alreadyBookedStatus, selectedTime, t]);

  const pastSlotIds = useMemo(() => {
    const now = new Date(nowTs);
    const fullDate = parseYyyyMmDdToLocalDate(selectedDate.id);
    const isToday =
      fullDate.getFullYear() === now.getFullYear() &&
      fullDate.getMonth() === now.getMonth() &&
      fullDate.getDate() === now.getDate();

    if (!isToday) {
      return new Set<string>();
    }

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const ids = new Set<string>();

    for (const slot of timeSlots) {
      const [hourText, minuteText] = slot.startTime.split(':');
      const hour = Number.parseInt(hourText ?? '0', 10);
      const minute = Number.parseInt(minuteText ?? '0', 10);
      const slotMinutes = hour * 60 + minute;
      if (slotMinutes <= currentMinutes) {
        ids.add(slot.id);
      }
    }

    return ids;
  }, [nowTs, selectedDate.id, timeSlots]);

  const occupiedSlotIds = useMemo(() => {
    const occupied = occupiedSlotsResponse?.items ?? [];
    if (!occupied.length || !timeSlots.length) {
      return new Set<string>();
    }

    const ids = new Set<string>();
    for (const slot of timeSlots) {
      const slotStart = timeToMinutes(slot.startTime);
      const slotEnd = slotStart + duration;

      const overlapsBooked = occupied.some((booked) => {
        const bookedStart = timeToMinutes(booked.startTime);
        const bookedEnd = bookedStart + booked.durationMinutes;
        return slotStart < bookedEnd && slotEnd > bookedStart;
      });

      if (overlapsBooked) {
        ids.add(slot.id);
      }
    }

    return ids;
  }, [occupiedSlotsResponse?.items, timeSlots, duration]);

  useEffect(() => {
    if (!timeSlots.length) {
      setTimeId('');
      return;
    }

    setTimeId((current) => {
      if (!current) {
        return '';
      }
      const exists = timeSlots.some((slot) => slot.id === current);
      const isPast = pastSlotIds.has(current);
      const isOccupied = occupiedSlotIds.has(current);
      return exists && !isPast && !isOccupied ? current : '';
    });
  }, [timeSlots, pastSlotIds, occupiedSlotIds]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setNowTs(Date.now());
    const timer = setInterval(() => setNowTs(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, [open]);

  useEffect(() => {
    const currentOption = calendarDates.find((option) => option.id === dateId);
    if (!currentOption || currentOption.disabled) {
      const firstAvailableDate = calendarDates.find((option) => !option.disabled);
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

  const totalPrice = useMemo(() => (duration / 60) * lessonPrice, [duration, lessonPrice]);

  const selectedScheduleSlots = useMemo(() => {
    if (!selectedTime) {
      return [];
    }

    const endMinutes = timeToMinutes(selectedTime.startTime) + SLOT_INTERVAL_MINUTES;
    const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(
      endMinutes % 60
    ).padStart(2, '0')}`;

    return [
      {
        date: selectedDateString,
        startTime: selectedTime.startTime,
        endTime,
        label: `${selectedDateString} . ${selectedTime.startTime} - ${endTime}`,
      },
    ];
  }, [selectedDateString, selectedTime]);

  const handleScheduleSelectionChange = (slots: SelectedScheduleSlot[]) => {
    const selected = slots[0];
    if (!selected) {
      setTimeId('');
      return;
    }

    const fullDate = parseYyyyMmDdToLocalDate(selected.date);
    setDateId(`${fullDate.getFullYear()}-${fullDate.getMonth() + 1}-${fullDate.getDate()}`);
    setTimeId(selected.startTime);
  };

  const footerTimeLabel = useMemo(() => {
    if (!selectedTime) {
      return t('noTimeSet');
    }
    const date = parseYyyyMmDdToLocalDate(selectedDateString);
    const dayLabel = new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).format(date);
    const endMinutes = timeToMinutes(selectedTime.startTime) + SLOT_INTERVAL_MINUTES;
    const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(
      endMinutes % 60
    ).padStart(2, '0')}`;
    return `${dayLabel} · ${selectedTime.startTime} - ${endTime}`;
  }, [selectedDateString, selectedTime, t]);

  const handleConfirm = async () => {
    if (!selectedTime || isBookingLocked) {
      return;
    }
    if (!isAuthenticated) {
      toast.error(t('loginRequiredTitle'), {
        description: t('loginRequiredDescription'),
      });
      return;
    }

    const startAt = `${selectedDateString}T${selectedTime.startTime}:00Z`;
    const payload: TrialBookingPayload = {
      duration,
      startAt,
      dayOfWeek: dbDayOfWeek,
      time: selectedTime as TrialTimeSlot,
    };

    if (onConfirm) {
      await onConfirm(payload);
      return;
    }

    const query = new URLSearchParams({
      tutorId: tutor.id,
      startAt: payload.startAt,
      durationMinutes: String(payload.duration),
      dayOfWeek: String(payload.dayOfWeek),
    });
    onOpenChange(false);
    router.push(`/checkout/trial-lesson?${query.toString()}`);
  };

  const isConfirmDisabled = isAvailabilityPending || isBookingLocked || !selectedTime;

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
    >
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="mx-auto flex h-[90vh]! max-h-screen w-full flex-col gap-0 overflow-hidden rounded-t-2xl border p-0"
      >
        <SheetHeader className="shrink-0 flex-row items-start justify-between gap-3 border-b px-4 py-3 sm:items-center sm:px-6 sm:py-4">
          <SheetTitle className="min-w-0 flex-1 text-left text-lg font-bold text-primary wrap-break-word sm:text-xl md:text-2xl">
            {t('title')}
          </SheetTitle>
          <Button
            variant="ghost"
            size="icon-sm"
            className="shrink-0"
            onClick={() => onOpenChange(false)}
          >
            <XIcon className="size-5" />
          </Button>
        </SheetHeader>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col px-4 pt-4 sm:px-6">
            <ScheduleSelection
              fillAvailableHeight
              className="min-h-0 flex-1"
              availableSlots={scheduleAvailableSlots}
              selectionMode="single"
              value={selectedScheduleSlots}
              onChange={handleScheduleSelectionChange}
              onWeekChange={({ weekOffset: nextWeekOffset }) => {
                setWeekOffset(nextWeekOffset);
              }}
            />
          </div>

          <Separator className="shrink-0" />

          <div className="shrink-0 bg-background px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-3">
              <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
                <div className="flex min-w-0 items-center gap-3">
                  <Image
                    src={tutor.avatar}
                    alt={tutor.name}
                    width={64}
                    height={64}
                    className="size-14 shrink-0 rounded-full object-cover sm:size-16"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-xl font-bold">{tutor.name}</p>
                    <p className="text-pretty text-base text-muted-foreground">
                      {t('expertTutorTitle', { subject: tutor.title })} -{' '}
                      {formatToCurrency(currency, lessonPrice)}
                      {t('perHour')}
                    </p>
                  </div>
                </div>
                <div className="relative inline-flex w-full max-w-full shrink-0 items-center rounded-lg border p-1 sm:w-auto">
                  <span
                    aria-hidden
                    className="absolute bottom-1 left-1 top-1 rounded-md bg-primary shadow-sm transition-transform duration-300 ease-out"
                    style={{
                      width: `calc((100% - 0.5rem) / ${DURATION_OPTIONS.length})`,
                      transform: `translateX(${selectedDurationIndex * 100}%)`,
                    }}
                  />
                  {DURATION_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`relative z-10 flex-1 cursor-pointer rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 sm:flex-none sm:px-4 sm:text-base ${
                        duration === option
                          ? 'text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                      onClick={() => setDuration(option)}
                    >
                      {t('durationMins', { value: option })}
                    </button>
                  ))}
                </div>
                <span className="inline-flex max-w-full min-w-0 items-center gap-1 rounded-full border px-3 py-2 text-sm font-medium sm:px-4 sm:text-base">
                  <span className="min-w-0 truncate">{footerTimeLabel}</span>
                  {selectedTime ? (
                    <button
                      type="button"
                      className="shrink-0 cursor-pointer rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      onClick={() => setTimeId('')}
                      aria-label={t('clearSelectedTime')}
                    >
                      <XIcon className="size-4" />
                    </button>
                  ) : null}
                </span>
              </div>
              <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-end lg:w-auto lg:shrink-0">
                <p className="text-2xl font-bold text-primary sm:text-3xl">
                  {formatToCurrency(currency, totalPrice)}
                </p>
                <Button
                  size="lg"
                  className="w-full min-w-0 text-base sm:w-auto sm:min-w-24"
                  disabled={isConfirmDisabled}
                  onClick={handleConfirm}
                >
                  <span className="line-clamp-2 text-center">{confirmButtonLabel}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
