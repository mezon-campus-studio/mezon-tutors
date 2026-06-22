'use client';

import {
  buildTutorLessonCancelledDmContent,
  buildTutorLessonRescheduleRequestDmContent,
  ECurrency,
  ETrialLessonBookingStatus,
  formatLessonRangeInTimezone,
  formatToCurrency,
  calendarEventHoursFromDayjs,
  isTrialLessonRescheduleEligible,
  ROUTES,
  type TutorSubscriptionWeekOccurrenceDto,
} from '@mezon-tutors/shared';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { useAtomValue } from 'jotai';
import { Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import ConnectGoogleCalendarButton from '@/components/google-calendar/ConnectGoogleCalendarButton';
import { Button } from '@/components/ui';
import { useUserTimezone } from '@/hooks';
import {
  isExpectedTutorLessonRequestError,
  resolveTutorCancelToastMessage,
  resolveTutorRescheduleToastMessage,
} from '@/lib/tutor-lesson-request-errors';
import { getWeekStartMondayInTimezone } from '@/lib/timezone';
import {
  type TrialLessonBookingRequestItem,
  useGetMyTrialLessonBookingRequests,
  useGetTutorCancelledSubscriptionLessons,
  useGetTutorSubscriptionWeekOccurrences,
  useGetTutorSubscriptionWeekOccurrencesBatch,
  useTutorCancelSubscriptionSlotMutation,
  useTutorCancelTrialLessonMutation,
  useTutorSubscriptionSlotRescheduleRequestMutation,
  useTutorRescheduleRequestMutation,
  useGetDmChannel,
  useCreateDmChannelMutation,
  usePublicAppSettings,
} from '@/services';
import { sendLessonDmToPeer } from '@/lib/send-lesson-dm';
import { getTutorRescheduleReasonLabel } from '@/lib/tutor-lesson-dm-reasons';
import { subscriptionQueryKey } from '@/services/subscription/subscription.qkey';
import { useMezonLight } from '@/providers';
import {
  CancelLessonDialog,
  type TrialCancelLessonTarget,
} from '@/views/main/my-lessons/components/CancelLessonDialog';
import {
  RescheduleLessonDialog,
  type TutorRescheduleLessonTarget,
} from '@/views/main/trial-bookings/components/RescheduleLessonDialog';
import { userAtom } from '@/store';
import { mapTutorBookingStatusToUi } from '@/lib/trial-booking-status';
import MyScheduleCalendarSection, {
  type ScheduleEventItem,
} from './components/MyScheduleCalendarSection';
import MyScheduleHeader, { type MyScheduleTab } from './components/MyScheduleHeader';
import MySchedulePanel from './components/MySchedulePanel';
import MyScheduleStudentsPanel from './components/MyScheduleStudentsPanel';
import { buildStudentItemsFromLessons } from './utils/build-student-items';

dayjs.extend(utc);
dayjs.extend(timezone);

const INITIAL_SUBSCRIPTION_WEEKS_TO_LOAD = 2;

const toScheduleEvent = (
  item: TrialLessonBookingRequestItem,
  weekStart: dayjs.Dayjs,
  weekEnd: dayjs.Dayjs,
  locale: string,
  timezoneName: string,
): ScheduleEventItem | null => {
  const start = dayjs(item.startAt).tz(timezoneName);
  if (!start.isValid()) return null;
  if (start.isBefore(weekStart) || !start.isBefore(weekEnd)) return null;

  const startLocal = start.locale(locale);
  const endLocal = startLocal.add(item.durationMinutes, 'minute');
  const { startHour, endHour } = calendarEventHoursFromDayjs(startLocal, endLocal);
  const now = dayjs().tz(timezoneName);
  const uiStatus = mapTutorBookingStatusToUi(item.status);
  const isCompleted = endLocal.isBefore(now) || uiStatus === 'completed';

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
    startHour,
    endHour,
    dateLabel: startLocal.format('ddd, MMM DD'),
    timeLabel: `${startLocal.format('HH:mm')} - ${endLocal.format('HH:mm')}`,
    lessonKind: item.scheduleKind === 'subscription' ? 'subscription' : 'trial',
    isCompleted,
    groupName: item.groupName,
  };
};

function subscriptionOccurrenceToRequestItem(
  o: TutorSubscriptionWeekOccurrenceDto,
  status: ETrialLessonBookingStatus = ETrialLessonBookingStatus.CONFIRMED,
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
    status,
    createdAt: o.startAt,
    scheduleKind: 'subscription',
    subscriptionEnrollmentId: o.enrollmentId,
    subscriptionSlotIndex: o.slotIndex,
    rescheduleRequestSubmitted: o.rescheduleRequestSubmitted ?? false,
    cancellationRequestSubmitted: o.cancellationRequestSubmitted ?? false,
    groupName: o.groupName,
  };
}

function itemToCancelTarget(
  item: TrialLessonBookingRequestItem,
  locale: string,
  timezoneName: string,
  trialLabel: string,
  planLabel: string,
): TrialCancelLessonTarget {
  const start = dayjs(item.startAt).tz(timezoneName).locale(locale);
  const end = start.add(item.durationMinutes, 'minute');
  const isSubscription = item.scheduleKind === 'subscription';

  return {
    id: item.id,
    source: isSubscription ? 'subscription' : 'trial',
    peerName: item.studentName,
    peerAvatarUrl: item.studentAvatarUrl,
    dateLabel: start.isValid() ? start.format('ddd, MMM DD') : '—',
    timeLabel: start.isValid() ? `${start.format('HH:mm')} - ${end.format('HH:mm')}` : '—',
    subject: isSubscription ? planLabel : trialLabel,
    startAt: item.startAt,
    grossAmount: item.grossAmount > 0 ? item.grossAmount : undefined,
    currency: ECurrency.VND,
  };
}

function itemToRescheduleTarget(
  item: TrialLessonBookingRequestItem,
  locale: string,
  timezoneName: string,
  planLessonLabel: string,
): TutorRescheduleLessonTarget {
  const start = dayjs(item.startAt).tz(timezoneName).locale(locale);
  const end = start.add(item.durationMinutes, 'minute');

  return {
    id: item.id,
    studentName: item.studentName,
    studentAvatarUrl: item.studentAvatarUrl,
    dateLabel: start.isValid() ? start.format('ddd, MMM DD') : '—',
    timeLabel: start.isValid() ? `${start.format('HH:mm')} - ${end.format('HH:mm')}` : '—',
    subject: planLessonLabel,
  };
}

function isLessonCompleted(
  item: TrialLessonBookingRequestItem,
  timezoneName: string,
): boolean {
  const start = dayjs(item.startAt).tz(timezoneName);
  const end = start.add(item.durationMinutes, 'minute');
  const now = dayjs().tz(timezoneName);
  return (
    end.isBefore(now) || mapTutorBookingStatusToUi(item.status) === 'completed'
  );
}

export default function MyScheduleView() {
  const t = useTranslations('Dashboard.mySchedule');
  const tReschedule = useTranslations('Dashboard.bookingRequests.reschedule');
  const tCancel = useTranslations('Dashboard.bookingRequests.cancellation');
  const locale = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAtomValue(userAtom);
  const userTimezone = useUserTimezone();
  const { data: publicAppSettings } = usePublicAppSettings();
  const senderId = user?.id ?? '';

  const canModifyLessonStart = (startAt: string) =>
    publicAppSettings != null &&
    isTrialLessonRescheduleEligible(
      startAt,
      new Date(),
      publicAppSettings.lessonChangePeriodHours,
    );
  const senderMezonUserId = user?.mezonUserId ?? '';

  const [activeTab, setActiveTab] = useState<MyScheduleTab>('calendar');
  const [selectedDate, setSelectedDate] = useState(dayjs().tz(userTimezone));
  const [subscriptionWeeksToLoad, setSubscriptionWeeksToLoad] = useState(
    INITIAL_SUBSCRIPTION_WEEKS_TO_LOAD,
  );
  const [isRescheduleDialogOpen, setIsRescheduleDialogOpen] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState<TutorRescheduleLessonTarget | null>(
    null,
  );
  const [rescheduleItem, setRescheduleItem] = useState<TrialLessonBookingRequestItem | null>(null);
  const [isRescheduleSubmitting, setIsRescheduleSubmitting] = useState(false);

  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<TrialCancelLessonTarget | null>(null);
  const [cancelItem, setCancelItem] = useState<TrialLessonBookingRequestItem | null>(null);
  const [isCancelSubmitting, setIsCancelSubmitting] = useState(false);

  const tutorSubscriptionRescheduleMutation = useTutorSubscriptionSlotRescheduleRequestMutation();
  const tutorTrialRescheduleMutation = useTutorRescheduleRequestMutation();
  const tutorCancelTrialMutation = useTutorCancelTrialLessonMutation();
  const tutorCancelSubscriptionMutation = useTutorCancelSubscriptionSlotMutation();
  const { lightClient, setLightClient } = useMezonLight();
  const recipientId = cancelItem?.studentId ?? rescheduleItem?.studentId ?? '';
  const recipientMezonUserId =
    cancelItem?.studentMezonUserId ?? rescheduleItem?.studentMezonUserId ?? '';
  const { refetch: refetchDmChannel } = useGetDmChannel(senderId, recipientId, false);
  const createDmChannelMutation = useCreateDmChannelMutation();

  const monday = getWeekStartMondayInTimezone(userTimezone, selectedDate);
  const weekEnd = monday.add(7, 'day');
  const weekStartYmd = monday.format('YYYY-MM-DD');

  const { data: trialData, isLoading: isTrialLoading } = useGetMyTrialLessonBookingRequests({
    statusIn: ['CONFIRMED', 'COMPLETED', 'CANCELLED'],
    page: 1,
    limit: 100,
  });

  const {
    data: cancelledSubscriptionRows = [],
    isLoading: isCancelledSubLoading,
  } = useGetTutorCancelledSubscriptionLessons();

  const anchorMonday = useMemo(
    () => getWeekStartMondayInTimezone(userTimezone),
    [userTimezone],
  );

  const subscriptionLessonWeekStarts = useMemo(
    () =>
      Array.from({ length: subscriptionWeeksToLoad }, (_, i) =>
        anchorMonday.add(i * 7, 'day').format('YYYY-MM-DD'),
      ),
    [anchorMonday, subscriptionWeeksToLoad],
  );

  const { data: subscriptionRowsCalendar = [], isLoading: isSubCalendarLoading } =
    useGetTutorSubscriptionWeekOccurrences(weekStartYmd, userTimezone);

  const {
    data: subscriptionRowsForLessons = [],
    isLoading: isSubLessonsLoading,
  } = useGetTutorSubscriptionWeekOccurrencesBatch(
    subscriptionLessonWeekStarts,
    userTimezone,
  );

  const calendarItems = useMemo(() => {
    const trialItems = (trialData?.items ?? []).filter(
      (item) => mapTutorBookingStatusToUi(item.status) !== 'cancelled',
    );
    const subItems = subscriptionRowsCalendar.map((o) =>
      subscriptionOccurrenceToRequestItem(o),
    );
    return [...trialItems, ...subItems];
  }, [trialData?.items, subscriptionRowsCalendar]);

  const lessonsListItems = useMemo(() => {
    const trialItems = trialData?.items ?? [];
    const subItems = subscriptionRowsForLessons.map((o) =>
      subscriptionOccurrenceToRequestItem(o),
    );
    const cancelledSubItems = cancelledSubscriptionRows.map((o) =>
      subscriptionOccurrenceToRequestItem(o, ETrialLessonBookingStatus.CANCELLED),
    );
    const seen = new Set<string>();
    return [...trialItems, ...subItems, ...cancelledSubItems].filter((item) => {
      const key = `${item.scheduleKind ?? 'trial'}-${item.id}-${item.startAt}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }, [trialData?.items, subscriptionRowsForLessons, cancelledSubscriptionRows]);

  const isLoading = isTrialLoading || isSubCalendarLoading;
  const isLessonsListLoading =
    isTrialLoading || isSubLessonsLoading || isCancelledSubLoading;

  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const day = monday.add(i, 'day').locale(locale);
        return {
          shortLabel: day.format('ddd').toUpperCase(),
          dateLabel: day.format('DD'),
        };
      }),
    [monday, locale],
  );

  const calendarTitle = `${monday.locale(locale).format('MMMM YYYY')}`;

  const eventsThisWeek = useMemo(() => {
    return calendarItems
      .map((item) => toScheduleEvent(item, monday, weekEnd, locale, userTimezone))
      .filter((item): item is ScheduleEventItem => Boolean(item));
  }, [calendarItems, monday, weekEnd, locale, userTimezone]);

  const { upcomingItems, pastItems } = useMemo(() => {
    const upcoming: TrialLessonBookingRequestItem[] = [];
    const past: TrialLessonBookingRequestItem[] = [];

    for (const item of lessonsListItems) {
      const ui = mapTutorBookingStatusToUi(item.status);
      if (ui === 'cancelled') {
        past.push(item);
        continue;
      }
      if (ui !== 'confirmed' && ui !== 'completed') {
        continue;
      }
      if (isLessonCompleted(item, userTimezone)) {
        past.push(item);
      } else {
        upcoming.push(item);
      }
    }

    upcoming.sort(
      (a, b) =>
        dayjs(a.startAt).tz(userTimezone).valueOf() -
        dayjs(b.startAt).tz(userTimezone).valueOf(),
    );
    past.sort(
      (a, b) =>
        dayjs(b.startAt).tz(userTimezone).valueOf() -
        dayjs(a.startAt).tz(userTimezone).valueOf(),
    );

    return { upcomingItems: upcoming, pastItems: past };
  }, [lessonsListItems, userTimezone]);

  const studentItems = useMemo(
    () => buildStudentItemsFromLessons(lessonsListItems, userTimezone),
    [lessonsListItems, userTimezone],
  );

  const today = dayjs().tz(userTimezone);
  const todayInWeek =
    today.isAfter(monday) && today.isBefore(weekEnd)
      ? today.startOf('day').diff(monday.startOf('day'), 'day')
      : undefined;
  const currentHourValue =
    todayInWeek !== undefined ? today.hour() + today.minute() / 60 : undefined;

  const handlePrevWeek = () => setSelectedDate((prev) => prev.subtract(7, 'day'));
  const handleNextWeek = () => {
    setSelectedDate((prev) => prev.add(7, 'day'));
    setSubscriptionWeeksToLoad((prev) => prev + 1);
  };
  const handleGoToToday = () => setSelectedDate(dayjs().tz(userTimezone));

  const isCurrentWeek = monday.isSame(
    getWeekStartMondayInTimezone(userTimezone),
    'day',
  );

  const handleCancelLesson = (item: TrialLessonBookingRequestItem) => {
    setCancelItem(item);
    setCancelTarget(
      itemToCancelTarget(item, locale, userTimezone, t('lessonTypeTrial'), t('lessonTypePlan')),
    );
    setIsCancelDialogOpen(true);
  };

  const handleConfirmCancel = async (reason: string, message?: string) => {
    if (!cancelItem) return;

    const lessonForDm = cancelItem;

    try {
      setIsCancelSubmitting(true);

      let cancelResult: { refunded: boolean; refundAmount: number; currency: string };

      if (cancelItem.scheduleKind === 'subscription') {
        if (
          cancelItem.subscriptionEnrollmentId == null ||
          cancelItem.subscriptionSlotIndex == null
        ) {
          throw new Error('Missing subscription lesson reference');
        }
        cancelResult = await tutorCancelSubscriptionMutation.mutateAsync({
          enrollmentId: cancelItem.subscriptionEnrollmentId,
          slotIndex: cancelItem.subscriptionSlotIndex,
          payload: {
            reason,
            message: message?.trim(),
            occurrenceStartAt: cancelItem.startAt,
          },
        });
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: [...subscriptionQueryKey.root, 'tutor-week-occurrences'],
          }),
          queryClient.invalidateQueries({
            queryKey: subscriptionQueryKey.tutorCancelledLessons(),
          }),
        ]);
      } else {
        cancelResult = await tutorCancelTrialMutation.mutateAsync({
          bookingId: cancelItem.id,
          payload: { reason, message: message?.trim() },
        });
        await queryClient.invalidateQueries({
          queryKey: ['trial-lesson-booking-my-requests'],
        });
      }

      const refundAmountLabel =
        cancelResult.refunded && cancelResult.refundAmount > 0
          ? formatToCurrency(
              cancelResult.currency === ECurrency.USD ||
                cancelResult.currency === ECurrency.PHP ||
                cancelResult.currency === ECurrency.VND
                ? cancelResult.currency
                : ECurrency.VND,
              cancelResult.refundAmount,
            )
          : null;

      if (lessonForDm.startAt && recipientMezonUserId) {
        try {
          await sendLessonDmToPeer({
            lightClient,
            setLightClient,
            senderId,
            senderMezonUserId,
            recipientId,
            recipientMezonUserId,
            refetchDmChannel: async () => {
              const r = await refetchDmChannel();
              return { data: r.data ?? null };
            },
            createDmChannelMutation,
            content: buildTutorLessonCancelledDmContent({
              lessonKind:
                lessonForDm.scheduleKind === 'subscription' ? 'subscription' : 'trial',
              originalLabel: formatLessonRangeInTimezone(
                lessonForDm.startAt,
                lessonForDm.durationMinutes,
                userTimezone,
                locale,
              ),
              reasonLabel: getTutorRescheduleReasonLabel(tReschedule, reason),
              message,
              refundAmountLabel,
              locale,
              senderAvatarUrl: user?.avatar,
            }),
          });
        } catch (dmError) {
          console.error('DM Error:', dmError);
          toast.error(tCancel('messageFailed'));
        }
      }

      toast.success(
        cancelResult.refunded ? tCancel('success') : tCancel('successNoRefund'),
      );
      setIsCancelDialogOpen(false);
      setCancelTarget(null);
      setCancelItem(null);
    } catch (error) {
      if (!isExpectedTutorLessonRequestError(error)) {
        console.error(error);
      }
      toast.error(resolveTutorCancelToastMessage(error, tCancel));
      setIsCancelDialogOpen(false);
      setCancelTarget(null);
      setCancelItem(null);
    } finally {
      setIsCancelSubmitting(false);
    }
  };

  const handleRescheduleLesson = (item: TrialLessonBookingRequestItem) => {
    if (item.rescheduleRequestSubmitted) {
      toast.error(tReschedule('alreadyRequested'));
      return;
    }
    if (!canModifyLessonStart(item.startAt)) {
      toast.error(tReschedule('within12Hours'));
      return;
    }
    const isSubscription = item.scheduleKind === 'subscription';
    if (
      isSubscription &&
      (item.subscriptionEnrollmentId == null || item.subscriptionSlotIndex == null)
    ) {
      toast.error(tReschedule('failed'));
      return;
    }
    setRescheduleItem(item);
    setRescheduleTarget(
      itemToRescheduleTarget(
        item,
        locale,
        userTimezone,
        isSubscription ? t('lessonTypePlan') : t('lessonTypeTrial'),
      ),
    );
    setIsRescheduleDialogOpen(true);
  };

  const handleConfirmReschedule = async (reason: string, message?: string) => {
    if (!rescheduleItem) return;

    const isSubscription = rescheduleItem.scheduleKind === 'subscription';

    try {
      setIsRescheduleSubmitting(true);

      if (isSubscription) {
        if (
          rescheduleItem.subscriptionEnrollmentId == null ||
          rescheduleItem.subscriptionSlotIndex == null
        ) {
          throw new Error('Missing subscription lesson reference');
        }
        await tutorSubscriptionRescheduleMutation.mutateAsync({
          enrollmentId: rescheduleItem.subscriptionEnrollmentId,
          slotIndex: rescheduleItem.subscriptionSlotIndex,
          payload: {
            reason,
            message: message?.trim() || undefined,
            occurrenceStartAt: rescheduleItem.startAt,
          },
        });
        await queryClient.invalidateQueries({
          queryKey: [...subscriptionQueryKey.root, 'tutor-week-occurrences'],
        });
      } else {
        await tutorTrialRescheduleMutation.mutateAsync({
          bookingId: rescheduleItem.id,
          payload: { reason, message: message?.trim() || undefined },
        });
        await queryClient.invalidateQueries({
          queryKey: ['trial-lesson-booking-my-requests'],
        });
      }

      if (rescheduleItem.startAt && recipientMezonUserId) {
        try {
          await sendLessonDmToPeer({
            lightClient,
            setLightClient,
            senderId,
            senderMezonUserId,
            recipientId,
            recipientMezonUserId,
            refetchDmChannel: async () => {
              const r = await refetchDmChannel();
              return { data: r.data ?? null };
            },
            createDmChannelMutation,
            content: buildTutorLessonRescheduleRequestDmContent({
              lessonKind: isSubscription ? 'subscription' : 'trial',
              originalLabel: formatLessonRangeInTimezone(
                rescheduleItem.startAt,
                rescheduleItem.durationMinutes,
                userTimezone,
                locale,
              ),
              reasonLabel: getTutorRescheduleReasonLabel(tReschedule, reason),
              message,
              locale,
              senderAvatarUrl: user?.avatar,
            }),
          });
        } catch (dmError) {
          console.error('DM Error:', dmError);
          toast.error(tReschedule('messageFailed'));
        }
      }

      toast.success(tReschedule('success'));
      setIsRescheduleDialogOpen(false);
      setRescheduleTarget(null);
      setRescheduleItem(null);
    } catch (error) {
      if (!isExpectedTutorLessonRequestError(error)) {
        console.error(error);
      }
      toast.error(resolveTutorRescheduleToastMessage(error, tReschedule));
      setIsRescheduleDialogOpen(false);
      setRescheduleTarget(null);
      setRescheduleItem(null);
    } finally {
      setIsRescheduleSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden">
      <div className="mx-auto w-full max-w-[1320px] px-4 py-6 md:px-6 md:py-8 lg:px-8">
        <div className="flex flex-col gap-5 md:gap-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <MyScheduleHeader activeTab={activeTab} onTabChange={setActiveTab} />
            <ConnectGoogleCalendarButton className="shrink-0" />
          </div>

          {((activeTab === 'calendar' && isLoading) ||
            ((activeTab === 'lessons' || activeTab === 'students') && isLessonsListLoading)) && (
            <div className="flex min-h-[400px] w-full items-center justify-center rounded-2xl border border-violet-100 bg-white">
              <p className="text-sm text-slate-500">{t('loading')}</p>
            </div>
          )}

          {activeTab === 'calendar' && !isLoading && (
            <MyScheduleCalendarSection
              weekDays={weekDays}
              calendarTitle={calendarTitle}
              events={eventsThisWeek}
              currentDayIndex={todayInWeek}
              currentHour={currentHourValue}
              isCurrentWeek={isCurrentWeek}
              timezoneName={userTimezone}
              weekStartYmd={weekStartYmd}
              onPrevWeek={handlePrevWeek}
              onNextWeek={handleNextWeek}
              onGoToToday={handleGoToToday}
            />
          )}

          {activeTab === 'lessons' && !isLessonsListLoading && (
            <MySchedulePanel
              upcomingItems={upcomingItems}
              pastItems={pastItems}
              timezoneName={userTimezone}
              lessonChangePeriodHours={publicAppSettings?.lessonChangePeriodHours}
              onRescheduleLesson={handleRescheduleLesson}
              onCancelLesson={handleCancelLesson}
            />
          )}

          {activeTab === 'students' && !isLessonsListLoading && (
            <MyScheduleStudentsPanel students={studentItems} />
          )}
        </div>
      </div>

      <RescheduleLessonDialog
        isOpen={isRescheduleDialogOpen}
        onClose={() => {
          setIsRescheduleDialogOpen(false);
          setRescheduleTarget(null);
          setRescheduleItem(null);
        }}
        onConfirm={handleConfirmReschedule}
        lesson={rescheduleTarget}
        lessonKind={
          rescheduleItem?.scheduleKind === 'subscription' ? 'subscription' : 'trial'
        }
        isLoading={isRescheduleSubmitting}
      />

      <CancelLessonDialog
        isOpen={isCancelDialogOpen}
        onClose={() => {
          setIsCancelDialogOpen(false);
          setCancelTarget(null);
          setCancelItem(null);
        }}
        onConfirm={handleConfirmCancel}
        lesson={cancelTarget}
        isLoading={isCancelSubmitting}
        variant="tutor"
        lessonKind={
          cancelItem?.scheduleKind === 'subscription' ? 'subscription' : 'trial'
        }
      />
    </div>
  );
}
