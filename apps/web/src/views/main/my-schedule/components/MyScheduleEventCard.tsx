'use client';

import { Badge } from '@/components/ui';
import { useTranslations } from 'next-intl';

type ScheduleEvent = {
  id: string;
  studentName: string;
  studentAvatarUrl?: string;
  startAt: string;
  durationMinutes: number;
  dayIndex: number;
  startHour: number;
  endHour: number;
  dateLabel: string;
  timeLabel: string;
  isCompleted: boolean;
};

type MyScheduleEventCardProps = {
  event: ScheduleEvent;
};

export default function MyScheduleEventCard({ event }: MyScheduleEventCardProps) {
  const t = useTranslations('Dashboard.mySchedule');
  return (
    <div
      className={`flex h-full min-h-0 max-h-full w-full min-w-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border px-1.5 py-1.5 text-center leading-snug ${event.isCompleted ? 'opacity-80' : ''}`}
      style={{
        backgroundColor: 'var(--calendar-mySchedule-event-bg)',
        borderColor: 'var(--calendar-mySchedule-grid-border)',
      }}
    >
      {event.isCompleted ? (
        <Badge
          variant="secondary"
          className="max-w-full shrink-0 truncate px-1.5 py-0 text-[9px] font-bold uppercase leading-none tracking-wide"
        >
          {t('completedBadge')}
        </Badge>
      ) : null}
      <p
        className="w-full min-h-0 shrink truncate text-[10px] font-bold uppercase tracking-wider"
        style={{ color: 'var(--calendar-mySchedule-event-text)' }}
      >
        {event.studentName}
      </p>
      <p className="w-full shrink-0 truncate text-[10px] leading-tight text-gray-500">{event.timeLabel}</p>
    </div>
  );
}
