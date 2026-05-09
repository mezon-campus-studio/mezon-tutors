'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Star, Calendar } from 'lucide-react';
import { Button } from '@/components/ui';
import type { LessonItem } from '@/services/my-lessons/my-lessons.api';
import { formatLessonDateLabel } from '@/components/calendar/utils/format-locale';

type LessonPersonBadgeProps = {
  name: string;
  avatar: string;
};

function LessonPersonBadge({ name, avatar }: LessonPersonBadgeProps) {
  return (
    <div className="w-14 h-14 rounded-xl overflow-hidden border border-gray-200 bg-gray-100 flex-shrink-0">
      <Image src={avatar} alt={name} width={56} height={56} className="object-cover" />
    </div>
  );
}

type PastLessonListItemProps = {
  lesson: LessonItem;
  rateLabel: string;
  ratedLabel: string;
  onRate: (tutorId: string) => void;
};

function PastLessonListItem({ lesson, rateLabel, ratedLabel, onRate }: PastLessonListItemProps) {
  const locale = useLocale();
  const rated = lesson.rating !== undefined;

  return (
    <div className="w-full border rounded-xl bg-white px-5 py-4 flex justify-between items-center gap-4 flex-wrap hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 flex-1 min-w-[220px]">
        <LessonPersonBadge name={lesson.tutor} avatar={lesson.tutorAvatar} />
        <div className="flex flex-col gap-1.5">
          <p className="text-sm leading-4 font-bold text-gray-900">{formatLessonDateLabel(lesson.dateLabel, locale)}</p>
          <p className="text-xl leading-6 font-extrabold text-gray-900">{lesson.timeLabel}</p>
          <p className="text-sm leading-4 text-gray-600">
            {lesson.subject} - {lesson.tutor}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 ml-auto">
        {rated ? (
          <div className="border rounded-lg px-3 py-2 bg-yellow-50 border-yellow-200 flex flex-col items-center min-w-[70px]">
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-bold text-yellow-600">
                {lesson.rating?.toFixed(1) ?? '5.0'}
              </span>
            </div>
            <span className="text-xs font-semibold text-yellow-600">{ratedLabel}</span>
          </div>
        ) : (
          <Button 
            variant="outline" 
            className="rounded-lg px-4 py-2 h-auto text-sm font-semibold hover:bg-yellow-50"
            onClick={() => onRate(lesson.tutorId)}
          >
            <Star className="w-3.5 h-3.5 mr-1.5 fill-yellow-400 text-yellow-400" />
            {rateLabel}
          </Button>
        )}

        <span className="text-gray-400 text-xl leading-5 px-2">...</span>
      </div>
    </div>
  );
}

type UpcomingLessonItemProps = {
  lesson: LessonItem;
  rescheduleOrCancelLabel: string;
  joinLessonLabel: string;
};

function UpcomingLessonItem({
  lesson,
  rescheduleOrCancelLabel,
  joinLessonLabel,
}: UpcomingLessonItemProps) {
  const locale = useLocale();
  return (
    <div className="w-full border rounded-xl bg-white px-5 py-4 flex justify-between items-center gap-4 flex-wrap hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 flex-1 min-w-[220px]">
        <LessonPersonBadge name={lesson.tutor} avatar={lesson.tutorAvatar} />
        <div className="flex flex-col gap-1.5">
          <p className="text-sm leading-4 font-bold text-gray-900">{formatLessonDateLabel(lesson.dateLabel, locale)}</p>
          <p className="text-xl leading-6 font-extrabold text-gray-900">{lesson.timeLabel}</p>
          <p className="text-sm leading-4 text-gray-600">
            {lesson.subject} - {lesson.tutor}
          </p>
        </div>
      </div>

      <div className="flex gap-3 ml-auto">
        <Button variant="outline" className="rounded-lg px-4 py-2 h-auto text-sm font-semibold">
          {rescheduleOrCancelLabel}
        </Button>
        <Button className="rounded-lg px-5 py-2 h-auto text-sm font-bold">
          {joinLessonLabel}
        </Button>
      </div>
    </div>
  );
}

type EmptyUpcomingCardProps = {
  scheduleNowLabel: string;
  noUpcomingLabel: string;
  noUpcomingHintLabel: string;
};

function EmptyUpcomingCard({
  scheduleNowLabel,
  noUpcomingLabel,
  noUpcomingHintLabel,
}: EmptyUpcomingCardProps) {
  return (
    <div className="w-full min-h-[220px] border rounded-xl bg-gray-50 flex flex-col items-center justify-center gap-2 p-4">
      <div className="w-7 h-7 border-2 border-gray-400 rounded-md flex flex-col items-center justify-center">
        <div className="w-4 h-0.5 bg-gray-400 mb-1" />
        <div className="w-2.5 h-2.5 border-2 border-gray-400 rounded" />
      </div>

      <h3 className="text-xl md:text-[28px] font-bold leading-tight md:leading-[34px] text-gray-900">{noUpcomingLabel}</h3>
      <p className="text-sm text-gray-600 text-center max-w-[380px]">{noUpcomingHintLabel}</p>

      <Button className="mt-2 px-4 rounded-lg">{scheduleNowLabel}</Button>
    </div>
  );
}

function LessonsSectionTitle({ title }: { title: string }) {
  return <h2 className="text-xl md:text-[28px] leading-tight md:leading-[34px] font-bold text-gray-900">{title}</h2>;
}

type LessonsSectionProps = {
  title: string;
  lessons: LessonItem[];
  emptyState?: React.ReactNode;
  rescheduleOrCancelLabel: string;
  joinLessonLabel: string;
};

function LessonsSection({
  title,
  lessons,
  emptyState,
  rescheduleOrCancelLabel,
  joinLessonLabel,
}: LessonsSectionProps) {
  return (
    <div className="flex flex-col gap-3">
      <LessonsSectionTitle title={title} />

      <div className="flex flex-col gap-2.5">
        {lessons.length ? (
          lessons.map((lesson) => (
            <UpcomingLessonItem
              key={lesson.id}
              lesson={lesson}
              rescheduleOrCancelLabel={rescheduleOrCancelLabel}
              joinLessonLabel={joinLessonLabel}
            />
          ))
        ) : (
          emptyState
        )}
      </div>
    </div>
  );
}

type PastLessonsSectionProps = {
  title: string;
  lessons: LessonItem[];
  rateLabel: string;
  ratedLabel: string;
  onRate: (tutorId: string) => void;
};

function PastLessonsSection({ title, lessons, rateLabel, ratedLabel, onRate }: PastLessonsSectionProps) {
  return (
    <div className="flex flex-col gap-3">
      <LessonsSectionTitle title={title} />

      <div className="flex flex-col gap-2.5">
        {lessons.map((lesson) => (
          <PastLessonListItem 
            key={lesson.id} 
            lesson={lesson} 
            rateLabel={rateLabel} 
            ratedLabel={ratedLabel}
            onRate={onRate}
          />
        ))}
      </div>
    </div>
  );
}

type MyLessonsPanelProps = {
  upcomingLessons: LessonItem[];
  previousLessons: LessonItem[];
};

export default function MyLessonsPanel({
  upcomingLessons,
  previousLessons,
}: MyLessonsPanelProps) {
  const t = useTranslations('MyLessons');
  const router = useRouter();

  const handleRate = (tutorId: string) => {
    router.push(`/tutors/${tutorId}`);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1032px] ml-0">
      <LessonsSection
        title={t('panels.lessons.upcoming.title')}
        lessons={upcomingLessons}
        rescheduleOrCancelLabel={t('panels.lessons.upcoming.rescheduleOrCancel')}
        joinLessonLabel={t('panels.lessons.upcoming.joinLesson')}
        emptyState={
          <EmptyUpcomingCard
            scheduleNowLabel={t('panels.lessons.upcoming.scheduleNow')}
            noUpcomingLabel={t('panels.lessons.upcoming.emptyTitle')}
            noUpcomingHintLabel={t('panels.lessons.upcoming.emptyDescription')}
          />
        }
      />

      {previousLessons.length > 0 && (
        <PastLessonsSection
          title={t('panels.lessons.past.title')}
          lessons={previousLessons}
          rateLabel={t('panels.lessons.past.rate')}
          ratedLabel={t('panels.lessons.past.rated')}
          onRate={handleRate}
        />
      )}
    </div>
  );
}
