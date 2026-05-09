'use client';

import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import Image from 'next/image';
import { Star, Compass } from 'lucide-react';
import { Button } from '@/components/ui';
import type { TutorItem } from '@/services/my-lessons/my-lessons.api';
import { formatTutorNextLessonLabel } from '@/components/calendar/utils/format-locale';

type TutorCardProps = {
  tutor: TutorItem;
  onOpenTutor: (tutorId: string) => void;
};

function TutorCard({ tutor, onOpenTutor }: TutorCardProps) {
  const t = useTranslations('MyLessons');
  const locale = useLocale();
  const displayNextLesson = tutor.nextLessonLabel 
    ? formatTutorNextLessonLabel(tutor.nextLessonLabel, locale) 
    : t('panels.tutors.unscheduled');

  return (
    <div className="w-full border rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap bg-white">
      <div
        className="flex items-center gap-4 flex-1 min-w-[260px] cursor-pointer"
        onClick={() => onOpenTutor(tutor.id)}
      >
        <Image
          src={tutor.avatar}
          alt={tutor.name}
          width={80}
          height={80}
          className="rounded-xl object-cover flex-shrink-0"
        />

        <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
          <h3 className="text-lg leading-6 font-extrabold text-gray-900">{tutor.name}</h3>
          <p className="text-[13px] leading-[18px] font-bold text-primary">{tutor.teaches}</p>

          <div className="flex gap-4 mt-2 flex-wrap">
            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-bold uppercase text-gray-500">
                {t('panels.tutors.completed')}
              </p>
              <p className="text-[15px] font-bold text-gray-900">
                {t('panels.tutors.lessonsCount', { count: tutor.completedLessons })}
              </p>
            </div>

            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-bold uppercase text-gray-500">
                {t('panels.tutors.nextLesson')}
              </p>
              <p className="text-[15px] font-bold text-gray-900">{displayNextLesson}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="ml-auto flex flex-col items-end gap-2.5">
        <div className="flex items-center gap-1.5">
          <Star className="w-[13px] h-[13px] fill-yellow-400 text-yellow-400" />
          <span className="text-[13px] font-bold text-gray-900">{tutor.ratingAverage.toFixed(1)}</span>
          <span className="text-[11px] text-gray-500">
            {t('panels.tutors.reviewCount', { count: tutor.reviewCount })}
          </span>
        </div>

        <div className="hidden md:flex flex-col gap-2">
          <Button className="rounded-full px-4 h-[34px] text-xs font-bold">
            {t('panels.tutors.schedule')}
          </Button>
          <Button variant="outline" className="rounded-full px-4 h-[34px] text-xs font-bold">
            {t('panels.tutors.message')}
          </Button>
        </div>

        <div className="flex md:hidden gap-2 w-full">
          <Button className="rounded-full px-3 h-[34px] text-xs font-bold flex-1">
            {t('panels.tutors.schedule')}
          </Button>
          <Button variant="outline" className="rounded-full px-3 h-[34px] text-xs font-bold flex-1">
            {t('panels.tutors.message')}
          </Button>
        </div>

        <span className="text-gray-400 text-lg leading-[18px] px-1.5">...</span>
      </div>
    </div>
  );
}

function DiscoverCard() {
  const t = useTranslations('MyLessons');

  return (
    <div className="w-full mt-2 border border-dashed rounded-[14px] bg-gray-50 flex flex-col items-center justify-center p-6 gap-2.5">
      <div className="w-[30px] h-[30px] rounded-full flex items-center justify-center bg-blue-100">
        <Compass className="w-4 h-4 text-blue-500" />
      </div>

      <h3 className="text-2xl leading-7 font-bold text-gray-900 text-center">
        {t('panels.tutors.discoverTitle')}
      </h3>
      <p className="text-[13px] text-gray-600 text-center max-w-[560px]">
        {t('panels.tutors.discoverDescription')}
      </p>

      <div className="flex gap-2.5 mt-2 flex-wrap justify-center">
        <Button className="rounded-full px-4 h-9 text-xs font-bold">
          {t('panels.tutors.findTutors')}
        </Button>
        <Button variant="outline" className="rounded-full px-4 h-9 text-xs font-bold">
          {t('panels.tutors.viewSubjects')}
        </Button>
      </div>
    </div>
  );
}

type MyTutorsPanelProps = {
  tutors: TutorItem[];
};

export default function MyTutorsPanel({ tutors }: MyTutorsPanelProps) {
  const t = useTranslations('MyLessons');
  const router = useRouter();

  const handleOpenTutor = (tutorId: string) => {
    router.push(`/tutors/${tutorId}`);
  };

  return (
    <div className="w-full max-w-[1032px] ml-0 flex flex-col gap-5">
      <div className="w-full flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl md:text-[32px] leading-tight md:leading-10 font-extrabold text-gray-900">
            {t('panels.tutors.title')}
          </h2>
          <p className="text-[13px] text-gray-600">
            {t('panels.tutors.subtitle', { count: tutors.length })}
          </p>
        </div>

        <Button
          className="rounded-full px-4 h-[38px] text-xs font-bold"
          onClick={() => router.push('/tutors')}
        >
          {t('panels.tutors.findNewTutors')}
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {tutors.map((tutor) => (
          <TutorCard key={tutor.id} tutor={tutor} onOpenTutor={handleOpenTutor} />
        ))}
      </div>

      <DiscoverCard />
    </div>
  );
}
