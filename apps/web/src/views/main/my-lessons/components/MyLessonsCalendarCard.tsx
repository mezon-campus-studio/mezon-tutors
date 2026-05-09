'use client';

import { useEffect, useState, useMemo } from 'react';
import { CalendarCard, type CalendarEvent, formatCalendarTitle, formatWeekDays, MobileCalendar, type MobileCalendarItem } from '@/components/calendar';
import { buildFallbackWeekDays, getFallbackWeekHours, formatHour24 } from '@mezon-tutors/shared';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import utc from 'dayjs/plugin/utc';
import { useTranslations, useLocale } from 'next-intl';
import type { LessonItem, MyLessonsCalendarMeta } from '@/services';
import MyLessonsEventCard from './MyLessonsEventCard';

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
  const [isMobile, setIsMobile] = useState(false);

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
    return lessons.map((lesson) => {
      return {
        id: lesson.id,
        dayIndex: lesson.dayIndex,
        title: lesson.subject,
        person: {
          name: lesson.tutor,
          avatar: lesson.tutorAvatar,
        },
        timeLabel: `${formatHour24(lesson.startHour)} - ${formatHour24(lesson.endHour)}`,
        category: lesson.subject,
        actionLabel: t('panels.lessons.upcoming.joinLesson'),
        onAction: () => {
          console.log('Join lesson:', lesson.id);
        },
      };
    });
  }, [lessons, t]);

  if (isMobile) {
    return (
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
    );
  }

  return (
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
}
