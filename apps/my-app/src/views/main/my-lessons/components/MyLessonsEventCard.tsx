'use client';

import type { LessonItem } from '@/services';

type MyLessonsEventCardProps = {
  lesson: LessonItem;
};

export default function MyLessonsEventCard({ lesson }: MyLessonsEventCardProps) {
  return (
    <div
      className="w-full h-full min-h-[86px] rounded-xl border p-2 flex flex-col items-center justify-center text-center gap-1 overflow-hidden"
      style={{
        backgroundColor: 'var(--calendar-myLessons-event-bg)',
        borderColor: 'var(--calendar-myLessons-grid-border)',
      }}
    >
      <p
        className="text-[10px] font-bold uppercase tracking-wider truncate w-full text-center"
        style={{ color: 'var(--calendar-myLessons-event-text)' }}
      >
        {lesson.subject}
      </p>
      <p className="text-xs font-medium text-gray-700 truncate w-full text-center">{lesson.tutor}</p>
      <p className="text-[10px] text-gray-500 truncate w-full text-center">{lesson.timeLabel}</p>
    </div>
  );
}
