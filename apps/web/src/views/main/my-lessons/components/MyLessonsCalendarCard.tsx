'use client';

import { useMemo, useState } from 'react';
import { formatCalendarTitle } from '@/components/calendar';
import { DashboardScheduleCalendar } from '@/components/schedule';
import { ROUTES } from '@mezon-tutors/shared';
import { parseYmdInTimezone } from '@/lib/timezone';
import { useLocale, useTranslations } from 'next-intl';
import type { LessonItem, MyLessonsCalendarMeta } from '@/services';
import { userAtom } from '@/store/auth.atom';
import { getAvatarGradient } from '@/lib/avatar-utils';
import ScheduleEventModal from '@/views/main/my-schedule/components/ScheduleEventModal';
import { SendMessageModal } from '@/components/common/SendMessageModal';
import MyLessonsEventCard from './MyLessonsEventCard';
import { useAtomValue } from 'jotai';

type MyLessonsCalendarCardProps = {
  lessons: LessonItem[];
  calendar: MyLessonsCalendarMeta;
  weekStartYmd: string;
  timezoneName: string;
  onPrevWeek?: () => void;
  onNextWeek?: () => void;
  onGoToToday?: () => void;
  isCurrentWeek?: boolean;
};

export default function MyLessonsCalendarCard({
  lessons,
  calendar,
  weekStartYmd,
  timezoneName,
  onPrevWeek,
  onNextWeek,
  onGoToToday,
  isCurrentWeek,
}: MyLessonsCalendarCardProps) {
  const t = useTranslations('MyLessons');
  const tModal = useTranslations('Dashboard.scheduleEventModal');
  const tDash = useTranslations('Dashboard.mySchedule');
  const locale = useLocale();
  const user = useAtomValue(userAtom);
  const [pickedLesson, setPickedLesson] = useState<LessonItem | null>(null);
  const [eventAnchorRect, setEventAnchorRect] = useState<DOMRect | null>(null);
  const [messageOpen, setMessageOpen] = useState(false);

  const formattedTitle = formatCalendarTitle(calendar.title, locale);

  const calendarEvents = useMemo(
    () =>
      lessons.filter(
        (lesson) =>
          lesson.source !== 'trial' ||
          lesson.trialBookingStatus === 'confirmed' ||
          lesson.trialBookingStatus === 'completed',
      ),
    [lessons],
  );

  const displayWeekDays = useMemo(() => {
    const monday = parseYmdInTimezone(weekStartYmd, timezoneName);
    return Array.from({ length: 7 }, (_, index) => {
      const day = monday.add(index, 'day').locale(locale);
      return {
        shortLabel: day.format('ddd').toUpperCase(),
        dateLabel: day.format('DD'),
        fullDate: day.toDate(),
      };
    });
  }, [weekStartYmd, timezoneName, locale]);

  const lessonModalDetailRows = useMemo(() => {
    if (!pickedLesson) return undefined;
    const minutes = Math.max(0, Math.round((pickedLesson.endHour - pickedLesson.startHour) * 60));
    const lessonType =
      pickedLesson.source === 'subscription' ? tDash('lessonTypePlan') : tDash('lessonTypeTrial');
    return [
      { label: tModal('detailSubject'), value: pickedLesson.subject },
      { label: tModal('detailCategory'), value: pickedLesson.category },
      { label: tModal('detailLessonType'), value: lessonType },
      { label: tModal('detailDuration'), value: tModal('durationMinutes', { minutes }) },
      {
        label: tModal('detailStatus'),
        value: pickedLesson.status === 'completed' ? tDash('completedBadge') : tModal('statusUpcoming'),
      },
    ];
  }, [pickedLesson, tModal, tDash]);

  const tutorPeerFirstName = pickedLesson?.tutor.trim().split(/\s+/)[0] ?? '';
  const eventGradient = pickedLesson ? getAvatarGradient(pickedLesson.source, pickedLesson.groupName) : undefined;

  return (
    <>
      <DashboardScheduleCalendar<LessonItem>
        title={formattedTitle}
        weekDays={displayWeekDays}
        events={calendarEvents}
        currentDayIndex={calendar.currentDayIndex}
        currentHour={calendar.currentHour}
        isCurrentWeek={isCurrentWeek}
        onPrevWeek={onPrevWeek}
        onNextWeek={onNextWeek}
        onGoToToday={onGoToToday}
        timezoneName={timezoneName}
        weekStartYmd={weekStartYmd}
        calendarType="myLessons"
        labels={{
          today: t('calendar.today'),
          weekBadge: t('schedule.calendar.week'),
          emptyDay: t('calendar.emptyDay'),
        }}
        renderEvent={(lesson, layout) => (
          <MyLessonsEventCard lesson={lesson} variant={layout ?? 'grid'} />
        )}
        onEventClick={(lesson, rect) => {
          setPickedLesson(lesson);
          setEventAnchorRect(rect);
        }}
      />

      <ScheduleEventModal
        open={pickedLesson !== null && !messageOpen}
        anchorRect={eventAnchorRect}
        onOpenChange={(open) => {
          if (!open) {
            setPickedLesson(null);
            setEventAnchorRect(null);
          }
        }}
        variant="student"
        peerName={pickedLesson?.tutor ?? ''}
        dateLabel={pickedLesson?.dateLabel ?? ''}
        timeLabel={pickedLesson?.timeLabel ?? ''}
        avatarUrl={pickedLesson?.tutorAvatar}
        avatarAlt={pickedLesson?.tutor}
        avatarGradient={eventGradient}
        detailRows={lessonModalDetailRows}
        viewProfileHref={pickedLesson ? ROUTES.TUTOR.DETAIL(pickedLesson.tutorId) : undefined}
        onSendMessage={() => setMessageOpen(true)}
      />

      <SendMessageModal
        open={messageOpen && pickedLesson !== null}
        title={tutorPeerFirstName}
        senderId={user?.id ?? ''}
        senderMezonUserId={user?.mezonUserId ?? ''}
        recipientId={pickedLesson?.tutorUserId ?? ''}
        recipientMezonUserId={pickedLesson?.tutorMezonUserId ?? ''}
        onOpenChangeAction={(open) => {
          setMessageOpen(open);
          if (!open) setPickedLesson(null);
        }}
      />
    </>
  );
}
