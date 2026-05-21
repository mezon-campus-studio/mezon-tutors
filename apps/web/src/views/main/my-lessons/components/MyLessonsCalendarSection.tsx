'use client';

import type { LessonItem, MyLessonsCalendarMeta } from '@/services/my-lessons/my-lessons.api';
import MyLessonsCalendarCard from './MyLessonsCalendarCard';

type MyLessonsCalendarSectionProps = {
  calendar: MyLessonsCalendarMeta;
  lessons: LessonItem[];
  weekStartYmd: string;
  timezoneName: string;
  onPrevWeek?: () => void;
  onNextWeek?: () => void;
  onGoToToday?: () => void;
  isCurrentWeek?: boolean;
};

export default function MyLessonsCalendarSection({
  calendar,
  lessons,
  weekStartYmd,
  timezoneName,
  onPrevWeek,
  onNextWeek,
  onGoToToday,
  isCurrentWeek,
}: MyLessonsCalendarSectionProps) {
  return (
    <MyLessonsCalendarCard
      lessons={lessons}
      calendar={calendar}
      weekStartYmd={weekStartYmd}
      timezoneName={timezoneName}
      onPrevWeek={onPrevWeek}
      onNextWeek={onNextWeek}
      onGoToToday={onGoToToday}
      isCurrentWeek={isCurrentWeek}
    />
  );
}
