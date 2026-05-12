'use client';

import { useEffect, useState, useMemo } from 'react';
import { CalendarCard, type CalendarEvent, formatCalendarTitle, formatWeekDays, MobileCalendar, type MobileCalendarItem } from '@/components/calendar';
import { buildFallbackWeekDays, getFallbackWeekHours, formatHour24, ROUTES } from '@mezon-tutors/shared';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import utc from 'dayjs/plugin/utc';
import { useTranslations, useLocale } from 'next-intl';
import type { LessonItem, MyLessonsCalendarMeta } from '@/services';
import { userAtom } from '@/store/auth.atom';
import ScheduleEventModal from '@/views/main/my-schedule/components/ScheduleEventModal';
import { SendMessageModal } from '@/components/common/SendMessageModal';
import MyLessonsEventCard from './MyLessonsEventCard';
import { useAtomValue } from 'jotai';

dayjs.extend(customParseFormat);
dayjs.extend(utc);

type MyLessonsCalendarCardProps = {
  lessons: LessonItem[];
  calendar: MyLessonsCalendarMeta;
  onPrevWeek?: () => void;
  onNextWeek?: () => void;
  onGoToToday?: () => void;
  isCurrentWeek?: boolean;
};

export default function MyLessonsCalendarCard({
  lessons,
  calendar,
  onPrevWeek,
  onNextWeek,
  onGoToToday,
  isCurrentWeek,
}: MyLessonsCalendarCardProps) {
  const t = useTranslations('MyLessons');
  const locale = useLocale();
  const user = useAtomValue(userAtom);
  const [isMobile, setIsMobile] = useState(false);
  const [pickedLesson, setPickedLesson] = useState<LessonItem | null>(null);
  const [eventAnchorRect, setEventAnchorRect] = useState<DOMRect | null>(null);
  const [messageOpen, setMessageOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const formattedTitle = formatCalendarTitle(calendar.title, locale);
  const calendarDate = dayjs.utc(calendar.title, 'MMMM YYYY', true);
  const yearLabel = calendarDate.isValid() ? calendarDate.format('YYYY') : dayjs.utc().format('YYYY');

  const displayWeekDays = formatWeekDays(
    calendar.weekDays.length ? calendar.weekDays : buildFallbackWeekDays(),
    locale
  );
  const displayWeekHours = calendar.weekHours.length ? calendar.weekHours : getFallbackWeekHours();

  const events: CalendarEvent<LessonItem>[] = lessons.map((lesson) => ({
    id: lesson.id,
    dayIndex: lesson.dayIndex,
    startHour: lesson.startHour,
    endHour: lesson.endHour,
    data: lesson,
  }));

  const mobileItems: MobileCalendarItem[] = useMemo(() => {
    return lessons.map((lesson) => ({
      id: lesson.id,
      dayIndex: lesson.dayIndex,
      title: lesson.subject,
      person: {
        name: lesson.tutor,
        avatar: lesson.tutorAvatar,
      },
      timeLabel: `${formatHour24(lesson.startHour)} - ${formatHour24(lesson.endHour)}`,
      category: lesson.subject,
      onCardPress: () => {
        setPickedLesson(lesson);
        setEventAnchorRect(null);
      },
    }));
  }, [lessons]);

  const tutorPeerFirstName = pickedLesson?.tutor.trim().split(/\s+/)[0] ?? '';

  const calendarBody = isMobile ? (
    <div className="w-full">
      <MobileCalendar
        type="myLessons"
        calendar={{
          title: calendar.title,
          weekDays: calendar.weekDays.length ? calendar.weekDays : buildFallbackWeekDays(),
          currentDayIndex: calendar.currentDayIndex,
        }}
        items={mobileItems}
        defaultAvatarUrl="https://i.pravatar.cc/300"
        onPrevWeek={onPrevWeek}
        onNextWeek={onNextWeek}
        enableCategoryFilter
        categoryAllLabel={t('mobile.allLessons')}
        categoryLabel={t('mobile.lessons')}
        emptyMessage={t('mobile.noLessonsForDay')}
      />
    </div>
  ) : (
    <div className="w-full">
      <CalendarCard
        type="myLessons"
        weekDays={displayWeekDays}
        weekHours={displayWeekHours}
        events={events}
        currentDayIndex={calendar.currentDayIndex}
        currentHour={calendar.currentHour}
        enableGapCollapse
        readonly
        onEventClick={(ev, rect) => {
          setPickedLesson(ev.data);
          setEventAnchorRect(rect);
        }}
        renderEvent={(event) => <MyLessonsEventCard lesson={event.data} />}
        presetData={{
          title: formattedTitle,
          weekLabel: t('calendar.switchWeek'),
          monthLabel: t('calendar.switchMonth'),
          showMonthNav: true,
          companyLabel: t('calendar.company', { year: yearLabel }),
          onPrevWeek,
          onNextWeek,
          showTodayButton: true,
          todayButtonDisabled: isCurrentWeek,
          onGoToToday,
        }}
      />
    </div>
  );

  return (
    <>
      {calendarBody}

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
