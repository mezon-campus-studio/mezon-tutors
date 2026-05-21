'use client';



import type { TutorAboutDto, TutorDetailAvailabilitySlotDto } from '@mezon-tutors/shared';

import { utcWeeklySlotsToCalendarInstances } from '@mezon-tutors/shared';

import { useTranslations } from 'next-intl';

import { useMemo } from 'react';

import { type ScheduleSlotInput, ScheduleViewer } from '@/components/common/ScheduleViewer';



type TutorScheduleTabProps = {

  tutor: TutorAboutDto & {

    availability: TutorDetailAvailabilitySlotDto[];

  };

};



function buildScheduleSlotsFromUtcAvailability(

  availability: TutorDetailAvailabilitySlotDto[],

  tutorTimezone: string,

  weeksAhead = 4,

): ScheduleSlotInput[] {

  const utcSlots = availability.map((slot) => ({

    dayOfWeek: slot.dayOfWeek,

    startTime: slot.startTime,

    endTime: slot.endTime,

    isActive: slot.isActive,

  }));



  const slots: ScheduleSlotInput[] = [];

  for (let weekOffset = 0; weekOffset < weeksAhead; weekOffset++) {

    const weekInstances = utcWeeklySlotsToCalendarInstances(

      utcSlots,

      tutorTimezone,

      weekOffset,

    );

    for (const instance of weekInstances) {

      slots.push({

        date: instance.date,

        startTime: instance.startTime,

        endTime: instance.endTime,

      });

    }

  }

  return slots;

}



export function TutorScheduleTab({ tutor }: TutorScheduleTabProps) {

  const t = useTranslations('Tutors.Detail');

  const scheduleTimezone = tutor.timezone || 'UTC';



  const availableSlots = useMemo(

    () => buildScheduleSlotsFromUtcAvailability(tutor.availability, scheduleTimezone),

    [tutor.availability, scheduleTimezone],

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


