'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { type TutorAboutDto, type TutorDetailAvailabilitySlotDto } from '@mezon-tutors/shared';
import { ScheduleViewer, type ScheduleSlotInput } from '@/components/common/ScheduleViewer';

type TutorScheduleTabProps = {
  tutor: TutorAboutDto & {
    availability: TutorDetailAvailabilitySlotDto[];
  };
};

function getDateForDayOfWeek(dbDayOfWeek: number, weekOffset: number = 0): string {
  const jsDay = (dbDayOfWeek + 1) % 7;

  const today = new Date();
  const currentDay = today.getDay();

  let daysToAdd = jsDay - currentDay;
  if (daysToAdd < 0) {
    daysToAdd += 7;
  }
  daysToAdd += weekOffset * 7;

  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + daysToAdd);

  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function generateAvailableSlots(
  availability: TutorDetailAvailabilitySlotDto[],
  weeksAhead: number = 4
): ScheduleSlotInput[] {
  const slots: ScheduleSlotInput[] = [];
  
  for (let weekOffset = 0; weekOffset < weeksAhead; weekOffset++) {
    for (const slot of availability) {
      if (!slot.isActive) continue;
      
      slots.push({
        date: getDateForDayOfWeek(slot.dayOfWeek, weekOffset),
        startTime: slot.startTime,
        endTime: slot.endTime,
      });
    }
  }
  
  return slots;
}

export function TutorScheduleTab({ tutor }: TutorScheduleTabProps) {
  const t = useTranslations('Tutors.Detail');

  const availableSlots = useMemo(
    () => generateAvailableSlots(tutor.availability),
    [tutor.availability]
  );

  const hasAvailability = tutor.availability?.length > 0;

  if (!hasAvailability) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900 mb-2">
            {t('scheduleTitle')}
          </h2>
          <p className="text-sm text-gray-600">
            {t('scheduleHint', { timezone: tutor.timezone })}
          </p>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
          <p className="text-center text-gray-600">
            {t('scheduleEmpty')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-extrabold text-gray-900 mb-2">
          {t('scheduleTitle')}
        </h2>
        <p className="text-sm text-gray-600">
          {t('scheduleHint', { timezone: tutor.timezone })}
        </p>
      </div>

      <ScheduleViewer
        availableSlots={availableSlots}
        timezone={tutor.timezone || 'UTC+7'}
      />
    </div>
  );
}
