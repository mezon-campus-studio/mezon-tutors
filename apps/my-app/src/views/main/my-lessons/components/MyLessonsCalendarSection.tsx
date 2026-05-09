'use client';

import type { LessonItem, MyLessonsCalendarMeta } from '@/services/my-lessons/my-lessons.api';
import MyLessonsCalendarCard from './MyLessonsCalendarCard';

type MyLessonsCalendarSectionProps = {
  calendar: MyLessonsCalendarMeta;
  lessons: LessonItem[];
  onPrevWeek?: () => void;
  onNextWeek?: () => void;
  onGoToToday?: () => void;
  isCurrentWeek?: boolean;
};

export default function MyLessonsCalendarSection({
  calendar,
  lessons,
  onPrevWeek,
  onNextWeek,
  onGoToToday,
  isCurrentWeek,
}: MyLessonsCalendarSectionProps) {
  return (
    <div className="flex flex-col gap-5 w-full">
      <MyLessonsCalendarCard
        lessons={lessons}
        calendar={calendar}
        onPrevWeek={onPrevWeek}
        onNextWeek={onNextWeek}
        onGoToToday={onGoToToday}
        isCurrentWeek={isCurrentWeek}
      />
    </div>
  );
}
