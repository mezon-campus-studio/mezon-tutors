'use client';

import {
  ETrialLessonBookingStatus,
  jsDayToDbDayOfWeek,
  type TutorAboutDto,
} from '@mezon-tutors/shared';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { useAtomValue } from 'jotai';
import { Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMemo, useState, useEffect } from 'react';
import {
  ScheduleSelection,
  type SelectedScheduleSlot,
} from '@/components/common/ScheduleSelection';
import { Badge, Spinner } from '@/components/ui';
import { useTutorScheduleGrid, useUserTimezone } from '@/hooks';
import { formatWeekdayShort, parseYmdInTimezone } from '@/lib/timezone';
import { useGetAlreadyBookedTrialLesson } from '@/services';
import { isAuthenticatedAtom, userAtom } from '@/store/auth.atom';

dayjs.extend(utc);
dayjs.extend(timezone);

type TutorScheduleTabProps = {
  tutor: TutorAboutDto;
};

const DURATION_OPTIONS = [30, 60] as const;

type ScheduleViewMode = 'guest' | 'bookable' | 'viewOnlyBooked';

function ScheduleDurationToggle({
  duration,
  onChange,
}: {
  duration: number;
  onChange: (value: number) => void;
}) {
  const t = useTranslations('Tutors.TrialBookingSheet');
  const selectedIndex = Math.max(0, DURATION_OPTIONS.indexOf(duration as 30 | 60));

  return (
    <div className="relative inline-flex w-full max-w-md items-center rounded-full border border-violet-100 bg-white p-1 sm:w-auto">
      <span
        aria-hidden
        className="absolute bottom-1 left-1 top-1 rounded-full bg-[linear-gradient(110deg,#7c3aed_0%,#9333ea_50%,#db2777_100%)] shadow-sm shadow-violet-300/40 transition-transform duration-300 ease-out"
        style={{
          width: `calc((100% - 0.5rem) / ${DURATION_OPTIONS.length})`,
          transform: `translateX(${selectedIndex * 100}%)`,
        }}
      />
      {DURATION_OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          className={`relative z-10 inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors duration-200 sm:flex-none sm:px-4 sm:py-2 sm:text-sm ${
            duration === option
              ? 'text-white'
              : 'text-slate-500 hover:text-violet-700'
          }`}
          onClick={() => onChange(option)}
        >
          <Clock className="size-3.5" />
          {t('durationMins', { value: option })}
        </button>
      ))}
    </div>
  );
}

export function TutorScheduleTab({ tutor }: TutorScheduleTabProps) {
  const t = useTranslations('Tutors.Detail');
  const router = useRouter();
  const userTimezone = useUserTimezone();
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const currentUser = useAtomValue(userAtom);
  const isOwnProfile = Boolean(currentUser?.id && currentUser.id === tutor.userId);
  const [duration, setDuration] = useState<number>(DURATION_OPTIONS[0]);
  const [weekOffset, setWeekOffset] = useState(0);

  const { data: alreadyBookedResponse, isPending: isAlreadyBookedPending } =
    useGetAlreadyBookedTrialLesson(tutor.id, isAuthenticated);

  const hasActiveTrialBooking = Boolean(
    alreadyBookedResponse?.hasBooked &&
      alreadyBookedResponse.status &&
      alreadyBookedResponse.status !== ETrialLessonBookingStatus.CANCELLED,
  );

  const bookedScheduleSlots = useMemo((): SelectedScheduleSlot[] => {
    if (!hasActiveTrialBooking || !alreadyBookedResponse?.startAt) {
      return [];
    }

    const bookingDuration =
      alreadyBookedResponse.durationMinutes ?? DURATION_OPTIONS[0];
    const startLocal = dayjs.utc(alreadyBookedResponse.startAt).tz(userTimezone);
    if (!startLocal.isValid()) {
      return [];
    }

    const date = startLocal.format('YYYY-MM-DD');
    const startTime = startLocal.format('HH:mm');
    const endTime = startLocal.add(bookingDuration, 'minute').format('HH:mm');

    return [
      {
        date,
        startTime,
        endTime,
        label: `${formatWeekdayShort(date, userTimezone)} . ${startTime} - ${endTime}`,
      },
    ];
  }, [
    hasActiveTrialBooking,
    alreadyBookedResponse?.startAt,
    alreadyBookedResponse?.durationMinutes,
    userTimezone,
  ]);

  useEffect(() => {
    const bookingDuration = alreadyBookedResponse?.durationMinutes;
    if (
      !hasActiveTrialBooking ||
      !bookingDuration ||
      !DURATION_OPTIONS.includes(bookingDuration as (typeof DURATION_OPTIONS)[number])
    ) {
      return;
    }
    setDuration(bookingDuration);
  }, [hasActiveTrialBooking, alreadyBookedResponse?.durationMinutes]);

  const viewMode = useMemo<ScheduleViewMode>(() => {
    if (!isAuthenticated || isOwnProfile) {
      return 'guest';
    }
    if (hasActiveTrialBooking) {
      return 'viewOnlyBooked';
    }
    return 'bookable';
  }, [isAuthenticated, isOwnProfile, hasActiveTrialBooking]);

  const includeOccupiedBlocking = viewMode !== 'guest';
  const readOnly = viewMode !== 'bookable';

  const {
    scheduleAvailableSlots,
    scheduleBlockedSlots,
    scheduleHeldSlots,
    isAvailabilityPending,
    isOccupiedDataLoading,
    hasAvailability,
  } = useTutorScheduleGrid({
    tutorId: tutor.id,
    duration,
    weekOffset,
    enabled: true,
    userTimezone,
    isAuthenticated,
    includeOccupiedBlocking,
  });

  const handleSlotSelect = (slots: SelectedScheduleSlot[]) => {
    const slot = slots[0];
    if (!slot || readOnly) {
      return;
    }

    const startAt = dayjs(`${slot.date} ${slot.startTime}`)
      .tz(userTimezone, true)
      .utc()
      .format();
    const dayOfWeek = jsDayToDbDayOfWeek(
      parseYmdInTimezone(slot.date, userTimezone).day(),
    );

    const query = new URLSearchParams({
      tutorId: tutor.id,
      startAt,
      durationMinutes: String(duration),
      dayOfWeek: String(dayOfWeek),
      timezone: userTimezone,
    });

    router.push(`/checkout/trial-lesson?${query.toString()}`);
  };

  const isLoading =
    isAvailabilityPending ||
    (isAuthenticated && isAlreadyBookedPending) ||
    isOccupiedDataLoading;

  const scheduleHeading = (
    <div className="mb-2 flex flex-wrap items-center gap-2">
      <h2 className="text-xl font-extrabold text-gray-900">{t('scheduleTitle')}</h2>
      {hasActiveTrialBooking ? (
        <Badge className="h-auto rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
          {t('scheduleTrialBookedBadge')}
        </Badge>
      ) : null}
    </div>
  );

  if (!isLoading && !hasAvailability) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          {scheduleHeading}
          <p className="text-sm text-gray-600">
            {t('scheduleHint', { timezone: userTimezone })}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
          <p className="text-center text-gray-600">{t('scheduleEmpty')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          {scheduleHeading}
          <p className="text-sm text-gray-600">
            {t('scheduleHint', { timezone: userTimezone })}
          </p>
        </div>

        <ScheduleDurationToggle duration={duration} onChange={setDuration} />
      </div>

      <div className="relative">
        {isLoading ? (
          <div className="absolute inset-0 z-10 flex min-h-[320px] items-center justify-center rounded-xl bg-white/70 backdrop-blur-[1px]">
            <Spinner className="size-8 text-violet-600" />
          </div>
        ) : null}

        <ScheduleSelection
          availableSlots={scheduleAvailableSlots}
          blockedSlots={scheduleBlockedSlots}
          heldSlots={scheduleHeldSlots}
          timezone={userTimezone}
          selectionMode="single"
          lessonDurationMinutes={duration}
          readOnly={readOnly}
          value={bookedScheduleSlots}
          selectableCellTitle={
            viewMode === 'bookable' ? t('scheduleBookTrialHover') : undefined
          }
          onChange={handleSlotSelect}
          onWeekChange={({ weekOffset: nextWeekOffset }) => {
            setWeekOffset(nextWeekOffset);
          }}
          maxBodyHeight="560px"
        />
      </div>
    </div>
  );
}
