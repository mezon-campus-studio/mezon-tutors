'use client';

import type { TutorAboutDto, TutorDetailAvailabilitySlotDto } from '@mezon-tutors/shared';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { type ScheduleSlotInput, ScheduleViewer } from '@/components/common/ScheduleViewer';

type TutorScheduleTabProps = {
  tutor: TutorAboutDto & {
    availability: TutorDetailAvailabilitySlotDto[];
  };
};

dayjs.extend(utc);
dayjs.extend(timezone);

function getDateForDayOfWeek(dbDayOfWeek: number, timezoneName: string, weekOffset = 0): string {
  const jsDay = (dbDayOfWeek + 1) % 7;
  const today = dayjs().tz(timezoneName).startOf('day');
  const currentDay = today.day();

  let daysToAdd = jsDay - currentDay;
  if (daysToAdd < 0) {
    daysToAdd += 7;
  }
  daysToAdd += weekOffset * 7;

  return today.add(daysToAdd, 'day').format('YYYY-MM-DD');
}

function generateAvailableSlots(
  availability: TutorDetailAvailabilitySlotDto[],
  timezoneName: string,
  weeksAhead = 4
): ScheduleSlotInput[] {
  const slots: ScheduleSlotInput[] = [];

  for (let weekOffset = 0; weekOffset < weeksAhead; weekOffset++) {
    for (const slot of availability) {
      if (!slot.isActive) continue;

      slots.push({
        date: getDateForDayOfWeek(slot.dayOfWeek, timezoneName, weekOffset),
        startTime: slot.startTime,
        endTime: slot.endTime,
      });
    }
  }

  return slots;
}

export function TutorScheduleTab({ tutor }: TutorScheduleTabProps) {
  const t = useTranslations('Tutors.Detail');
  const scheduleTimezone = tutor.timezone || 'UTC';

  const availableSlots = useMemo(
    () => generateAvailableSlots(tutor.availability, scheduleTimezone),
    [tutor.availability, scheduleTimezone]
  );

  const hasAvailability = tutor.availability?.length > 0;

  if (!hasAvailability) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900 mb-2">{t('scheduleTitle')}</h2>
          <p className="text-sm text-gray-600">{t('scheduleHint', { timezone: tutor.timezone })}</p>
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
        <p className="text-sm text-gray-600">{t('scheduleHint', { timezone: tutor.timezone })}</p>
      </div>

      <ScheduleViewer
        availableSlots={availableSlots}
        timezone={scheduleTimezone}
      />
    </div>
  );
}
