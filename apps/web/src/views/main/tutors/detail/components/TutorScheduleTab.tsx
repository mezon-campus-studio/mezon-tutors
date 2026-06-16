'use client';

import type { TutorAboutDto, TutorDetailAvailabilitySlotDto } from '@mezon-tutors/shared';
import { utcWeeklySlotsToCalendarInstances } from '@mezon-tutors/shared';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { type ScheduleSlotInput, ScheduleViewer } from '@/components/common/ScheduleViewer';
import { useUserTimezone } from '@/hooks';

type TutorScheduleTabProps = {
  tutor: TutorAboutDto & {
    availability: TutorDetailAvailabilitySlotDto[];
  };
};

/** Weeks pre-expanded for ScheduleViewer modal navigation (viewer-local dates/times). */
const WEEKS_AHEAD = 8;

function buildViewerScheduleSlots(
  availability: TutorDetailAvailabilitySlotDto[],
  viewerTimezone: string,
): ScheduleSlotInput[] {
  const utcSlots = availability.map((slot) => ({
    dayOfWeek: slot.dayOfWeek,
    startTime: slot.startTime,
    endTime: slot.endTime,
    isActive: slot.isActive,
  }));

  const merged: ScheduleSlotInput[] = [];
  for (let weekOffset = 0; weekOffset < WEEKS_AHEAD; weekOffset++) {
    const instances = utcWeeklySlotsToCalendarInstances(
      utcSlots,
      viewerTimezone,
      weekOffset,
    );
    merged.push(...instances);
  }
  return merged;
}

export function TutorScheduleTab({ tutor }: TutorScheduleTabProps) {
  const t = useTranslations('Tutors.Detail');
  const viewerTimezone = useUserTimezone();

  const availableSlots = useMemo(
    () => buildViewerScheduleSlots(tutor.availability, viewerTimezone),
    [tutor.availability, viewerTimezone],
  );

  const hasAvailability = tutor.availability?.some((slot) => slot.isActive) ?? false;

  if (!hasAvailability) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900 mb-2">{t('scheduleTitle')}</h2>
          <p className="text-sm text-gray-600">
            {t('scheduleHint', { timezone: viewerTimezone })}
          </p>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
          <p className="text-center text-gray-600">{t('scheduleEmpty')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-extrabold text-gray-900 mb-2">{t('scheduleTitle')}</h2>
        <p className="text-sm text-gray-600">
          {t('scheduleHint', { timezone: viewerTimezone })}
        </p>
      </div>

      <ScheduleViewer
        availableSlots={availableSlots}
        timezone={viewerTimezone}
        className="-mx-2 sm:mx-0"
      />
    </div>
  );
}
