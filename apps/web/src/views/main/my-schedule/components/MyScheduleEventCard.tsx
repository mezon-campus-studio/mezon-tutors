'use client';

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
};

type MyScheduleEventCardProps = {
  event: ScheduleEvent;
};

export default function MyScheduleEventCard({ event }: MyScheduleEventCardProps) {
  return (
    <div
      className="flex h-full min-h-[80px] w-full flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border p-2 text-center"
      style={{
        backgroundColor: 'var(--calendar-mySchedule-event-bg)',
        borderColor: 'var(--calendar-mySchedule-grid-border)',
      }}
    >
      <p
        className="w-full truncate text-[10px] font-bold uppercase tracking-wider"
        style={{ color: 'var(--calendar-mySchedule-event-text)' }}
      >
        {event.studentName}
      </p>
      <p className="w-full truncate text-[10px] text-gray-500">{event.timeLabel}</p>
    </div>
  );
}
