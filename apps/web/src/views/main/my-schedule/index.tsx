'use client';

import dayjs from 'dayjs';
import { CalendarRange, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui';
import { ROUTES, type ETrialLessonBookingStatus, type TutorSubscriptionWeekOccurrenceDto } from '@mezon-tutors/shared';
import {
  useGetMyTrialLessonBookingRequests,
  useGetTutorSubscriptionWeekOccurrences,
  type TrialLessonBookingRequestItem,
} from '@/services';
import MyScheduleCalendarCard from './components/MyScheduleCalendarCard';
import MyScheduleUpcomingList from './components/MyScheduleUpcomingList';
import { mapTutorBookingStatusToUi } from '../trial-bookings';
import { useAtomValue } from 'jotai';
import { userAtom } from '@/store';
import ScheduleEventModal from './components/ScheduleEventModal';
import { SendMessageModal } from '@/components/common/SendMessageModal';

type ScheduleEventItem = {
  id: string;
  tutorId: string;
  studentId: string;
  studentMezonUserId: string | null;
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
  lessonKind: 'trial' | 'subscription';
};

const buildWeekStartMonday = (date: dayjs.Dayjs) => {
  const dayOfWeek = date.day();
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  return date.subtract(mondayOffset, 'day').startOf('day');
};

const roundToHalfHour = (hour: number): number => {
  const wholeHour = Math.floor(hour);
  const minutes = (hour - wholeHour) * 60;
  if (minutes < 15) return wholeHour;
  if (minutes < 45) return wholeHour + 0.5;
  return wholeHour + 1;
};

const toScheduleEvent = (
  item: TrialLessonBookingRequestItem,
  weekStart: dayjs.Dayjs,
  weekEnd: dayjs.Dayjs,
  locale: string,
): Omit<ScheduleEventItem, 'isCompleted'> | null => {
  const start = dayjs(item.startAt);
  if (!start.isValid()) return null;
  if (start.isBefore(weekStart) || !start.isBefore(weekEnd)) return null;

  const startLocal = start.locale(locale);
  const endLocal = startLocal.add(item.durationMinutes, 'minute');

  const diffDays = startLocal.startOf('day').diff(weekStart.startOf('day'), 'day');

  return {
    id: item.id,
    tutorId: item.tutorId,
    studentId: item.studentId,
    studentMezonUserId: item.studentMezonUserId,
    studentName: item.studentName,
    studentAvatarUrl: item.studentAvatarUrl,
    startAt: item.startAt,
    durationMinutes: item.durationMinutes,
    dayIndex: Math.max(0, Math.min(6, diffDays)),
    startHour: roundToHalfHour(startLocal.hour() + startLocal.minute() / 60),
    endHour: roundToHalfHour(endLocal.hour() + endLocal.minute() / 60),
    dateLabel: startLocal.format('ddd, MMM DD'),
    timeLabel: `${startLocal.format('HH:mm')} - ${endLocal.format('HH:mm')}`,
    lessonKind: item.scheduleKind === 'subscription' ? 'subscription' : 'trial',
  };
};

function subscriptionOccurrenceToRequestItem(
  o: TutorSubscriptionWeekOccurrenceDto,
): TrialLessonBookingRequestItem {
  return {
    id: o.id,
    tutorId: o.tutorProfileId,
    studentId: o.studentId,
    studentMezonUserId: o.studentMezonUserId,
    studentName: o.studentName,
    studentAvatarUrl: o.studentAvatarUrl ?? undefined,
    startAt: o.startAt,
    durationMinutes: o.durationMinutes,
    grossAmount: 0,
    platformFee: 0,
    tutorAmount: 0,
    status: 'CONFIRMED' as ETrialLessonBookingStatus,
    createdAt: o.startAt,
    scheduleKind: 'subscription',
  };
}

export default function MyScheduleView() {
  const t = useTranslations('Dashboard.mySchedule');
  const locale = useLocale();
  const router = useRouter();
  const user = useAtomValue(userAtom);

  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [pickedEvent, setPickedEvent] = useState<ScheduleEventItem | null>(null);
  const [eventAnchorRect, setEventAnchorRect] = useState<DOMRect | null>(null);
  const [messageOpen, setMessageOpen] = useState(false);

  const weekStart = useMemo(
    () => buildWeekStartMonday(selectedDate),
    [selectedDate],
  );
  const weekEnd = useMemo(() => weekStart.add(7, 'day'), [weekStart]);
  const weekStartYmd = useMemo(() => weekStart.format('YYYY-MM-DD'), [weekStart]);

  const { data: trialData, isLoading: isTrialLoading } = useGetMyTrialLessonBookingRequests({
    status: 'CONFIRMED',
    page: 1,
    limit: 100,
  });

  const { data: subscriptionRows = [], isLoading: isSubLoading } =
    useGetTutorSubscriptionWeekOccurrences(weekStartYmd);

  const items = useMemo(() => {
    const trialItems = trialData?.items ?? [];
    const subItems = subscriptionRows.map(subscriptionOccurrenceToRequestItem);
    return [...trialItems, ...subItems];
  }, [trialData?.items, subscriptionRows]);

  const isLoading = isTrialLoading || isSubLoading;

  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const day = weekStart.add(i, 'day').locale(locale);
        return {
          shortLabel: day.format('ddd').toUpperCase(),
          dateLabel: day.format('MMM DD'),
        };
      }),
    [weekStart, locale],
  );

  const calendarTitle = `${weekStart.locale(locale).format('MMMM YYYY')}`;

  const eventsThisWeek = useMemo(() => {
    const now = dayjs();
    return items
      .map((item) => {
        const ev = toScheduleEvent(item, weekStart, weekEnd, locale);
        if (!ev) return null;
        const endAt = dayjs(item.startAt).add(item.durationMinutes, 'minute');
        return { ...ev, isCompleted: endAt.isBefore(now) };
      })
      .filter((item): item is ScheduleEventItem => Boolean(item));
  }, [items, weekStart, weekEnd, locale]);

  const weekListItems = useMemo(() => {
    return items
      .filter((item) => {
        const start = dayjs(item.startAt);
        return !start.isBefore(weekStart) && start.isBefore(weekEnd);
      })
      .filter((item) => mapTutorBookingStatusToUi(item.status) === 'confirmed')
      .sort(
        (a, b) =>
          dayjs(a.startAt).valueOf() - dayjs(b.startAt).valueOf(),
      );
  }, [items, weekStart, weekEnd]);

  const today = dayjs();
  const todayInWeek =
    today.isAfter(weekStart) && today.isBefore(weekEnd)
      ? today.startOf('day').diff(weekStart.startOf('day'), 'day')
      : undefined;
  const currentHourValue =
    todayInWeek !== undefined ? today.hour() + today.minute() / 60 : undefined;

  const handlePrevWeek = () =>
    setSelectedDate((prev) => prev.subtract(7, 'day'));
  const handleNextWeek = () => setSelectedDate((prev) => prev.add(7, 'day'));
  const handleGoToToday = () => setSelectedDate(dayjs());

  const isCurrentWeek = weekStart.isSame(buildWeekStartMonday(dayjs()), 'day');

  return (
    <main className="min-h-screen">
      <div className="mx-auto w-full px-4 py-6 md:px-7 md:py-8">
        <div className="flex flex-col gap-5 md:gap-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#7c3aed,#ec4899)] text-white shadow-md shadow-violet-300/40">
                <CalendarRange className="size-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-500">
                  {t('eyebrow')}
                </p>
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">
                  {t('title')}
                </h1>
                <p className="mt-1 text-sm text-slate-500">{t('subtitle')}</p>
              </div>
            </div>

            <Button
              type="button"
              onClick={() => router.push(ROUTES.DASHBOARD.TRIAL_BOOKING)}
              className="group inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-[linear-gradient(110deg,#7c3aed_0%,#9333ea_50%,#db2777_100%)] px-5 text-sm font-semibold text-white shadow-md shadow-violet-300/40 transition-all hover:shadow-lg hover:shadow-violet-400/50"
            >
              <Sparkles className="size-4" />
              {t('header.viewRequests')}
            </Button>
          </div>

          {isLoading ? (
            <div className="flex min-h-[400px] w-full items-center justify-center rounded-2xl border border-violet-100 bg-white">
              <p className="text-sm text-slate-500">{t('loading')}</p>
            </div>
          ) : (
            <div className="grid min-h-0 grid-cols-1 gap-6 xl:grid-cols-[1fr_400px]">
              <MyScheduleCalendarCard
                title={calendarTitle}
                weekDays={weekDays}
                events={eventsThisWeek}
                currentDayIndex={todayInWeek}
                currentHour={currentHourValue}
                isCurrentWeek={isCurrentWeek}
                onPrevWeek={handlePrevWeek}
                onNextWeek={handleNextWeek}
                onGoToToday={handleGoToToday}
                onSelectEvent={(ev, rect) => {
                  setPickedEvent(ev);
                  setEventAnchorRect(rect);
                }}
              />

              <div className="min-h-0">
                <MyScheduleUpcomingList items={weekListItems} />
              </div>
            </div>
          )}
        </div>
      </div>

      <ScheduleEventModal
        open={pickedEvent !== null && !messageOpen}
        anchorRect={eventAnchorRect}
        onOpenChange={(open) => {
          if (!open) {
            setPickedEvent(null);
            setEventAnchorRect(null);
          }
        }}
        variant="tutor"
        peerName={pickedEvent?.studentName ?? ''}
        dateLabel={pickedEvent?.dateLabel ?? ''}
        timeLabel={pickedEvent?.timeLabel ?? ''}
        onSendMessage={() => setMessageOpen(true)}
      />

      <SendMessageModal
        open={messageOpen && pickedEvent !== null}
        title={pickedEvent?.studentName?.trim().split(/\s+/)[0] ?? ''}
        senderId={user?.id ?? ''}
        senderMezonUserId={user?.mezonUserId ?? ''}
        recipientId={pickedEvent?.studentId ?? ''}
        recipientMezonUserId={pickedEvent?.studentMezonUserId ?? ''}
        onOpenChangeAction={(open) => {
          setMessageOpen(open);
          if (!open) setPickedEvent(null);
        }}
      />
    </main>
  );
}
