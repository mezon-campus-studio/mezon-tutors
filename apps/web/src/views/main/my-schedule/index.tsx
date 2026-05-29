'use client';

import {
  buildTutorLessonCancelledDmContent,
  buildTutorLessonRescheduleRequestDmContent,
  ECurrency,
  type ETrialLessonBookingStatus,
  formatLessonRangeInTimezone,
  ROUTES,
  type TutorSubscriptionWeekOccurrenceDto,
} from '@mezon-tutors/shared';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { useAtomValue } from 'jotai';
import { CalendarRange, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { SendMessageModal } from '@/components/common/SendMessageModal';
import { useUserTimezone } from '@/hooks';
import { DashboardScheduleCalendar } from '@/components/schedule';
import { Button } from '@/components/ui';
import { isTrialLessonRescheduleEligible } from '@/lib/trial-lesson-cancellation';
import {
  type TrialLessonBookingRequestItem,
  useGetMyTrialLessonBookingRequests,
  useGetTutorSubscriptionWeekOccurrences,
  useTutorCancelSubscriptionSlotMutation,
  useTutorCancelTrialLessonMutation,
  useTutorSubscriptionSlotRescheduleRequestMutation,
  useGetDmChannel,
  useCreateDmChannelMutation,
} from '@/services';
import { sendLessonDmToPeer } from '@/lib/send-lesson-dm';
import {
  getStudentFacingCancelReasonLabel,
  getTutorRescheduleReasonLabel,
} from '@/lib/tutor-lesson-dm-reasons';
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
import MyScheduleEventCard from './components/MyScheduleEventCard';
import MyScheduleUpcomingList from './components/MyScheduleUpcomingList';
import ScheduleEventModal from './components/ScheduleEventModal';

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

dayjs.extend(utc);
dayjs.extend(timezone);

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
  timezoneName: string
): ScheduleEventItem | null => {
  const start = dayjs(item.startAt).tz(timezoneName);
  if (!start.isValid()) return null;
  if (start.isBefore(weekStart) || !start.isBefore(weekEnd)) return null;

  const startLocal = start.locale(locale);
  const endLocal = startLocal.add(item.durationMinutes, 'minute');
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
    startHour: roundToHalfHour(startLocal.hour() + startLocal.minute() / 60),
    endHour: roundToHalfHour(endLocal.hour() + endLocal.minute() / 60),
    dateLabel: startLocal.format('ddd, MMM DD'),
    timeLabel: `${startLocal.format('HH:mm')} - ${endLocal.format('HH:mm')}`,
    lessonKind: item.scheduleKind === 'subscription' ? 'subscription' : 'trial',
    isCompleted,
  };
};

function subscriptionOccurrenceToRequestItem(
  o: TutorSubscriptionWeekOccurrenceDto
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
    subscriptionEnrollmentId: o.enrollmentId,
    subscriptionSlotIndex: o.slotIndex,
    rescheduleRequestSubmitted: o.rescheduleRequestSubmitted ?? false,
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

export default function MyScheduleView() {
  const t = useTranslations('Dashboard.mySchedule');
  const tModal = useTranslations('Dashboard.scheduleEventModal');
  const tReschedule = useTranslations('Dashboard.bookingRequests.reschedule');
  const tCancel = useTranslations('Dashboard.bookingRequests.cancellation');
  const tCancelReasons = useTranslations('MyLessons.panels.lessons.cancellation');
  const locale = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAtomValue(userAtom);
  const userTimezone = useUserTimezone();
  const senderId = user?.id ?? '';
  const senderMezonUserId = user?.mezonUserId ?? '';

  const [selectedDate, setSelectedDate] = useState(dayjs().tz(userTimezone));
  const [pickedEvent, setPickedEvent] = useState<ScheduleEventItem | null>(null);
  const [eventAnchorRect, setEventAnchorRect] = useState<DOMRect | null>(null);
  const [messageOpen, setMessageOpen] = useState(false);
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
  const tutorCancelTrialMutation = useTutorCancelTrialLessonMutation();
  const tutorCancelSubscriptionMutation = useTutorCancelSubscriptionSlotMutation();
  const { lightClient, setLightClient } = useMezonLight();
  const recipientId = cancelItem?.studentId ?? rescheduleItem?.studentId ?? '';
  const recipientMezonUserId =
    cancelItem?.studentMezonUserId ?? rescheduleItem?.studentMezonUserId ?? '';
  const { refetch: refetchDmChannel } = useGetDmChannel(senderId, recipientId, false);
  const createDmChannelMutation = useCreateDmChannelMutation();

  const weekStart = useMemo(() => buildWeekStartMonday(selectedDate), [selectedDate]);
  const weekEnd = useMemo(() => weekStart.add(7, 'day'), [weekStart]);
  const weekStartYmd = useMemo(() => weekStart.format('YYYY-MM-DD'), [weekStart]);

  const { data: trialData, isLoading: isTrialLoading } = useGetMyTrialLessonBookingRequests({
    statusIn: ['CONFIRMED', 'COMPLETED'],
    page: 1,
    limit: 100,
  });

  const { data: subscriptionRows = [], isLoading: isSubLoading } =
    useGetTutorSubscriptionWeekOccurrences(weekStartYmd, userTimezone);

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
          dateLabel: day.format('DD'),
        };
      }),
    [weekStart, locale]
  );

  const calendarTitle = `${weekStart.locale(locale).format('MMMM YYYY')}`;

  const eventsThisWeek = useMemo(() => {
    return items
      .map((item) => toScheduleEvent(item, weekStart, weekEnd, locale, userTimezone))
      .filter((item): item is ScheduleEventItem => Boolean(item));
  }, [items, weekStart, weekEnd, locale, userTimezone]);

  const weekListItems = useMemo(() => {
    return items
      .filter((item) => {
        const start = dayjs(item.startAt).tz(userTimezone);
        return !start.isBefore(weekStart) && start.isBefore(weekEnd);
      })
      .filter((item) => {
        const ui = mapTutorBookingStatusToUi(item.status);
        return ui === 'confirmed' || ui === 'completed';
      })
      .sort(
        (a, b) =>
          dayjs(a.startAt).tz(userTimezone).valueOf() - dayjs(b.startAt).tz(userTimezone).valueOf()
      );
  }, [items, weekStart, weekEnd, userTimezone]);

  const today = dayjs().tz(userTimezone);
  const todayInWeek =
    today.isAfter(weekStart) && today.isBefore(weekEnd)
      ? today.startOf('day').diff(weekStart.startOf('day'), 'day')
      : undefined;
  const currentHourValue =
    todayInWeek !== undefined ? today.hour() + today.minute() / 60 : undefined;

  const handlePrevWeek = () => setSelectedDate((prev) => prev.subtract(7, 'day'));
  const handleNextWeek = () => setSelectedDate((prev) => prev.add(7, 'day'));
  const handleGoToToday = () => setSelectedDate(dayjs().tz(userTimezone));

  const isCurrentWeek = weekStart.isSame(buildWeekStartMonday(dayjs().tz(userTimezone)), 'day');

  const handleCancelLesson = (item: TrialLessonBookingRequestItem) => {
    if (!isTrialLessonRescheduleEligible(item.startAt)) {
      toast.error(tCancel('within12Hours'));
      return;
    }
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

      if (cancelItem.scheduleKind === 'subscription') {
        if (
          cancelItem.subscriptionEnrollmentId == null ||
          cancelItem.subscriptionSlotIndex == null
        ) {
          throw new Error('Missing subscription lesson reference');
        }
        await tutorCancelSubscriptionMutation.mutateAsync({
          enrollmentId: cancelItem.subscriptionEnrollmentId,
          slotIndex: cancelItem.subscriptionSlotIndex,
          payload: {
            reason,
            message: message?.trim(),
            occurrenceStartAt: cancelItem.startAt,
          },
        });
        await queryClient.invalidateQueries({
          queryKey: subscriptionQueryKey.tutorWeekOccurrences(weekStartYmd, userTimezone),
        });
      } else {
        await tutorCancelTrialMutation.mutateAsync({
          bookingId: cancelItem.id,
          payload: { reason, message: message?.trim() },
        });
        await queryClient.invalidateQueries({
          queryKey: ['trial-lesson-booking-my-requests'],
        });
      }

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
              reasonLabel: getStudentFacingCancelReasonLabel(tCancelReasons, reason),
              message,
              locale,
              senderAvatarUrl: user?.avatar,
            }),
          });
        } catch (dmError) {
          console.error('DM Error:', dmError);
          toast.error(tCancel('messageFailed'));
        }
      }

      toast.success(tCancel('success'));
      setIsCancelDialogOpen(false);
      setCancelTarget(null);
      setCancelItem(null);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : tCancel('failed'));
    } finally {
      setIsCancelSubmitting(false);
    }
  };

  const handleRescheduleSubscription = (item: TrialLessonBookingRequestItem) => {
    if (item.rescheduleRequestSubmitted) {
      toast.error(tReschedule('alreadyRequested'));
      return;
    }
    if (!isTrialLessonRescheduleEligible(item.startAt)) {
      toast.error(tReschedule('within12Hours'));
      return;
    }
    if (
      item.subscriptionEnrollmentId == null ||
      item.subscriptionSlotIndex == null
    ) {
      toast.error(tReschedule('failed'));
      return;
    }
    setRescheduleItem(item);
    setRescheduleTarget(itemToRescheduleTarget(item, locale, userTimezone, t('lessonTypePlan')));
    setIsRescheduleDialogOpen(true);
  };

  const handleConfirmReschedule = async (reason: string, message?: string) => {
    if (!rescheduleItem) return;
    if (
      rescheduleItem.subscriptionEnrollmentId == null ||
      rescheduleItem.subscriptionSlotIndex == null
    ) {
      return;
    }

    try {
      setIsRescheduleSubmitting(true);
      await tutorSubscriptionRescheduleMutation.mutateAsync({
        enrollmentId: rescheduleItem.subscriptionEnrollmentId,
        slotIndex: rescheduleItem.subscriptionSlotIndex,
        payload: {
          reason,
          message: message?.trim() || undefined,
          occurrenceStartAt: rescheduleItem.startAt,
        },
      });

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
              lessonKind: 'subscription',
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

      await queryClient.invalidateQueries({
        queryKey: subscriptionQueryKey.tutorWeekOccurrences(weekStartYmd, userTimezone),
      });

      toast.success(tReschedule('success'));
      setIsRescheduleDialogOpen(false);
      setRescheduleTarget(null);
      setRescheduleItem(null);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : tReschedule('failed'));
    } finally {
      setIsRescheduleSubmitting(false);
    }
  };

  const scheduleEventDetailRows = useMemo(() => {
    if (!pickedEvent) return undefined;
    return [
      {
        label: tModal('detailLessonType'),
        value:
          pickedEvent.lessonKind === 'subscription' ? t('lessonTypePlan') : t('lessonTypeTrial'),
      },
      {
        label: tModal('detailDuration'),
        value: tModal('durationMinutes', {
          minutes: pickedEvent.durationMinutes,
        }),
      },
      {
        label: tModal('detailStatus'),
        value: pickedEvent.isCompleted ? t('completedBadge') : tModal('statusUpcoming'),
      },
    ];
  }, [pickedEvent, t, tModal]);

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
              <DashboardScheduleCalendar<ScheduleEventItem>
                title={calendarTitle}
                weekDays={weekDays}
                events={eventsThisWeek}
                currentDayIndex={todayInWeek}
                currentHour={currentHourValue}
                isCurrentWeek={isCurrentWeek}
                onPrevWeek={handlePrevWeek}
                onNextWeek={handleNextWeek}
                onGoToToday={handleGoToToday}
                labels={{
                  today: t('calendar.today'),
                  weekBadge: t('calendar.week'),
                }}
                renderEvent={(event) => <MyScheduleEventCard event={event} />}
                onEventClick={(ev, rect) => {
                  setPickedEvent(ev);
                  setEventAnchorRect(rect);
                }}
              />

              <div className="min-h-0">
                <MyScheduleUpcomingList
                  items={weekListItems}
                  timezoneName={userTimezone}
                  onRescheduleSubscription={handleRescheduleSubscription}
                  onCancelLesson={handleCancelLesson}
                />
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
        avatarUrl={pickedEvent?.studentAvatarUrl}
        avatarAlt={pickedEvent?.studentName}
        detailRows={scheduleEventDetailRows}
        onSendMessage={() => setMessageOpen(true)}
      />

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
          rescheduleItem?.scheduleKind === "subscription" ? "subscription" : "trial"
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
