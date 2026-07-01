'use client';

import {
  getLessonEndAt,
  MEZON_DIRECT_MESSAGE_URL,
  ROUTES,
  isTrialLessonRescheduleEligible,
} from '@mezon-tutors/shared';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import {
  CalendarClock,
  CalendarPlus,
  CalendarX,
  ExternalLink,
  History,
  Info,
  Sparkles,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAtomValue } from 'jotai';
import { ActionMenu } from '@/components/common/ActionMenu';
import { formatLessonDateLabel } from '@/components/calendar/utils/format-locale';
import { Avatar, AvatarFallback, AvatarImage, Badge, Button, toast } from '@/components/ui';
import { ensureMezonDmChannel } from '@/lib/ensure-mezon-dm-channel';
import { cn } from '@/lib/utils';
import { mapTutorBookingStatusToUi } from '@/lib/trial-booking-status';
import { useMezonLight } from '@/providers';
import {
  useGetDmChannel,
  useCreateDmChannelMutation,
  useGetSupportBotContact,
  type TrialLessonBookingRequestItem,
} from '@/services';
import { userAtom } from '@/store/auth.atom';

dayjs.extend(utc);
dayjs.extend(timezone);

type MySchedulePanelProps = {
  upcomingItems: TrialLessonBookingRequestItem[];
  pastItems: TrialLessonBookingRequestItem[];
  timezoneName: string;
  lessonChangePeriodHours?: number;
  onRescheduleLesson?: (item: TrialLessonBookingRequestItem) => void;
  onCancelLesson?: (item: TrialLessonBookingRequestItem) => void;
};

type SectionHeaderProps = {
  icon: typeof CalendarPlus;
  accent: string;
  eyebrow: string;
  title: string;
  count?: number;
};

function SectionHeader({ icon: Icon, accent, eyebrow, title, count }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br ${accent} text-white shadow-md shadow-violet-300/40`}
      >
        <Icon className="size-5" />
      </div>
      <div className="leading-tight">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-500">
          {eyebrow}
        </p>
        <h2 className="text-xl font-extrabold text-slate-900 md:text-2xl">
          {title}
          {typeof count === 'number' ? (
            <span className="ml-2 inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-violet-100 px-2 text-xs font-bold text-violet-700">
              {count}
            </span>
          ) : null}
        </h2>
      </div>
    </div>
  );
}

type LessonStatusBadgeTone = 'neutral' | 'pending' | 'approved' | 'rejected';

const LESSON_STATUS_BADGE_STYLES: Record<LessonStatusBadgeTone, string> = {
  neutral: 'bg-slate-100 text-slate-600 ring-slate-200',
  pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  rejected: 'bg-rose-50 text-rose-700 ring-rose-200',
};

function LessonStatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: LessonStatusBadgeTone;
}) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        'h-9 rounded-full border-0 px-4 text-xs font-bold ring-1',
        LESSON_STATUS_BADGE_STYLES[tone],
      )}
    >
      {label}
    </Badge>
  );
}

type LessonPersonBadgeProps = {
  name: string;
  avatar?: string;
};

function LessonPersonBadge({ name, avatar }: LessonPersonBadgeProps) {
  const initials =
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'S';

  return (
    <Avatar className="size-14 shrink-0 rounded-2xl ring-2 ring-white shadow-sm shadow-violet-200/40">
      {avatar ? <AvatarImage src={avatar} alt={name} className="object-cover" /> : null}
      <AvatarFallback className="rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-sm font-bold text-white">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

function isTrialLessonItem(item: TrialLessonBookingRequestItem): boolean {
  return item.scheduleKind !== 'subscription';
}

function isScheduleLessonInProgress(
  item: TrialLessonBookingRequestItem,
  now: Date = new Date(),
): boolean {
  if (!item.startAt || mapTutorBookingStatusToUi(item.status) === 'cancelled') {
    return false;
  }

  const start = dayjs(item.startAt).utc();
  const end = dayjs(getLessonEndAt(item.startAt, item.durationMinutes)).utc();
  const nowUtc = dayjs(now).utc();

  return !nowUtc.isBefore(start) && nowUtc.isBefore(end);
}

type UpcomingScheduleLessonItemProps = {
  item: TrialLessonBookingRequestItem;
  timezoneName: string;
  lessonChangePeriodHours?: number;
  rescheduleOrCancelLabel: string;
  viewDetailLabel: string;
  cancelledLabel: string;
  onRescheduleLesson?: (item: TrialLessonBookingRequestItem) => void;
  onCancelLesson?: (item: TrialLessonBookingRequestItem) => void;
};

function UpcomingScheduleLessonItem({
  item,
  timezoneName,
  lessonChangePeriodHours,
  rescheduleOrCancelLabel,
  viewDetailLabel,
  cancelledLabel,
  onRescheduleLesson,
  onCancelLesson,
}: UpcomingScheduleLessonItemProps) {
  const t = useTranslations('Dashboard.mySchedule');
  const tPanels = useTranslations('Dashboard.mySchedule.panels.lessons');
  const locale = useLocale();
  const tGroups = useTranslations('Groups');
  const currentUser = useAtomValue(userAtom);
  const [now, setNow] = useState(() => new Date());
  const [isJoining, setIsJoining] = useState(false);
  const senderId = currentUser?.id ?? '';
  const senderMezonUserId = currentUser?.mezonUserId ?? '';
  const { lightClient, setLightClient } = useMezonLight();
  const { data: botContact } = useGetSupportBotContact();
  const { refetch: refetchDmChannel } = useGetDmChannel(senderId, botContact?.id ?? '', false);
  const createDmChannelMutation = useCreateDmChannelMutation();
  const nowInTimezone = dayjs().tz(timezoneName);

  const isSubscription = item.scheduleKind === 'subscription';
  const start = dayjs.utc(item.startAt).tz(timezoneName).locale(locale);
  const end = start.add(item.durationMinutes, 'minute');
  const uiStatus = mapTutorBookingStatusToUi(item.status);
  const isCancelled = uiStatus === 'cancelled';
  const isInProgress = isScheduleLessonInProgress(item, now);
  const lessonTypeLabel = isSubscription ? t('lessonTypePlan') : t('lessonTypeTrial');
  const timeLabel = `${start.format('HH:mm')} - ${end.format('HH:mm')}`;
  const canManageLesson = !isCancelled && onRescheduleLesson != null && onCancelLesson != null;

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const withinChangePeriod =
    lessonChangePeriodHours != null &&
    Boolean(item.startAt) &&
    !isTrialLessonRescheduleEligible(
      item.startAt,
      nowInTimezone.toDate(),
      lessonChangePeriodHours,
    );

  const canReschedule =
    canManageLesson && !withinChangePeriod && !item.rescheduleRequestSubmitted;

  const showRescheduleNotice =
    canManageLesson &&
    !isInProgress &&
    !item.rescheduleRequestSubmitted &&
    withinChangePeriod;

  const actionItems = [
    {
      label: tPanels('upcoming.reschedule'),
      icon: <CalendarClock className="size-4" />,
      onClick: () => onRescheduleLesson?.(item),
      disabled: !canReschedule,
    },
    {
      label: tPanels('upcoming.cancel'),
      icon: <Trash2 className="size-4 text-destructive" />,
      onClick: () => onCancelLesson?.(item),
      variant: 'destructive' as const,
    },
  ];

  const handleJoinNow = async () => {
    if (!botContact) {
      toast.error("Bot contact is not loaded yet.");
      return;
    }
    try {
      setIsJoining(true);
      const existingChannelId = (await refetchDmChannel()).data?.channelId;
      const channelId = await ensureMezonDmChannel({
        lightClient,
        setLightClient,
        senderId,
        senderMezonUserId,
        recipientId: botContact.id,
        recipientMezonUserId: botContact.mezonUserId,
        existingChannelId,
        createDmChannelMutation,
      });
      window.open(MEZON_DIRECT_MESSAGE_URL(channelId), '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : tPanels('upcoming.joinNowFailed'),
      );
    } finally {
      setIsJoining(false);
    }
  };

  const joinNowButton = (
    <Button
      variant="gradient"
      className="h-11 w-full rounded-full px-4 text-xs font-semibold text-white sm:h-9 sm:w-auto sm:min-w-28"
      onClick={() => void handleJoinNow()}
      disabled={isJoining}
    >
      <ExternalLink className="mr-1 size-3.5" />
      {tPanels('upcoming.joinLesson')}
    </Button>
  );

  return (
    <div className="group flex w-full flex-col gap-0 rounded-2xl border border-violet-100 bg-white transition-all hover:border-violet-200 hover:shadow-md hover:shadow-violet-100/40">
      <div className="flex w-full flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <LessonPersonBadge name={item.studentName} avatar={item.studentAvatarUrl} />
          <div className="min-w-0 flex flex-col gap-0.5">
            {item.groupName && (
              <p className="mt-1 text-[11px] font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md inline-block w-fit">
                {tGroups('groupStudyPrefix')}: {item.groupName}
              </p>
            )}
            <p className="text-xs font-semibold text-violet-600">
              {formatLessonDateLabel(start.format('ddd, MMM DD'), locale)}
            </p>
            <p className="text-lg font-extrabold leading-none text-slate-900">{timeLabel}</p>
            
            <p className="mt-1 text-xs text-slate-600">
              <span className="font-semibold text-violet-700">{lessonTypeLabel}</span>
              <span className="mx-1.5 text-slate-300">·</span>
              <span className="break-words">{item.studentName}</span>
            </p>
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row">
          {isCancelled ? (
            <LessonStatusBadge label={cancelledLabel} tone="neutral" />
          ) : canManageLesson ? (
            <>
              {isInProgress ? joinNowButton : null}
              {!isInProgress ? (
                <ActionMenu
                  trigger={
                    <Button
                      variant="outline"
                      className="h-11 w-full rounded-full border-slate-200 px-4 text-xs font-semibold text-slate-700 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 sm:h-9 sm:w-auto"
                    >
                      {rescheduleOrCancelLabel}
                    </Button>
                  }
                  items={actionItems}
                />
              ) : null}
              {!isInProgress && isTrialLessonItem(item) ? (
                <Link href={ROUTES.DASHBOARD.TRIAL_BOOKING_DETAIL(item.id)} className="w-full sm:w-auto">
                  <Button
                    variant="outline"
                    className="h-11 w-full rounded-full border-violet-200 px-4 text-xs font-semibold text-violet-700 hover:border-violet-300 hover:bg-violet-50 sm:h-9 sm:w-auto"
                  >
                    {viewDetailLabel}
                  </Button>
                </Link>
              ) : null}
            </>
          ) : item.rescheduleRequestSubmitted ? (
            <LessonStatusBadge
              label={tPanels('status.reschedulePending')}
              tone="pending"
            />
          ) : null}
        </div>
      </div>

      {showRescheduleNotice ? (
        <div className="flex items-start gap-2.5 rounded-b-2xl border-t border-amber-100 bg-amber-50/70 px-4 py-3 sm:px-5">
          <Info className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
          <p className="text-xs leading-relaxed text-amber-700">
            {tPanels('upcoming.rescheduleNotice', {
              hours: lessonChangePeriodHours ?? 12,
            })}
          </p>
        </div>
      ) : null}
    </div>
  );
}

type PastScheduleLessonItemProps = {
  item: TrialLessonBookingRequestItem;
  timezoneName: string;
  cancelledLabel: string;
  viewDetailLabel: string;
};

function PastScheduleLessonItem({
  item,
  timezoneName,
  cancelledLabel,
  viewDetailLabel,
}: PastScheduleLessonItemProps) {
  const t = useTranslations('Dashboard.mySchedule');
  const tGroups = useTranslations('Groups');
  const locale = useLocale();

  const isSubscription = item.scheduleKind === 'subscription';
  const start = dayjs.utc(item.startAt).tz(timezoneName).locale(locale);
  const end = start.add(item.durationMinutes, 'minute');
  const uiStatus = mapTutorBookingStatusToUi(item.status);
  const isCancelled = uiStatus === 'cancelled';
  const lessonTypeLabel = isSubscription ? t('lessonTypePlan') : t('lessonTypeTrial');
  const timeLabel = `${start.format('HH:mm')} - ${end.format('HH:mm')}`;

  return (
    <div className="group flex w-full flex-col gap-4 rounded-2xl border border-violet-100 bg-white px-4 py-4 transition-all hover:border-violet-200 hover:shadow-md hover:shadow-violet-100/40 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-5">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <LessonPersonBadge name={item.studentName} avatar={item.studentAvatarUrl} />
        <div className="min-w-0 flex flex-col gap-0.5">
          {item.groupName && (
            <p className="mt-1 text-[11px] font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md inline-block w-fit">
              {tGroups('groupStudyPrefix')}: {item.groupName}
            </p>
          )}
          <p className="text-xs font-semibold text-slate-500">
            {formatLessonDateLabel(start.format('ddd, MMM DD'), locale)}
          </p>
          <p className="text-lg font-extrabold leading-none text-slate-900">{timeLabel}</p>
          
          <p className="mt-1 text-xs text-slate-600">
            <span className="font-semibold text-violet-700">{lessonTypeLabel}</span>
            <span className="mx-1.5 text-slate-300">·</span>
            <span className="break-words">{item.studentName}</span>
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:ml-auto sm:justify-end">
        {isCancelled ? (
          <LessonStatusBadge label={cancelledLabel} tone="neutral" />
        ) : isTrialLessonItem(item) ? (
          <Link href={ROUTES.DASHBOARD.TRIAL_BOOKING_DETAIL(item.id)}>
            <Button
              variant="outline"
              className="h-9 rounded-full border-violet-200 px-4 text-xs font-semibold text-violet-700 hover:border-violet-300 hover:bg-violet-50"
            >
              {viewDetailLabel}
            </Button>
          </Link>
        ) : null}
      </div>
    </div>
  );
}

type EmptyUpcomingCardProps = {
  onViewRequests: () => void;
};

function EmptyUpcomingCard({ onViewRequests }: EmptyUpcomingCardProps) {
  const tPanels = useTranslations('Dashboard.mySchedule.panels.lessons');

  return (
    <div className="relative w-full overflow-hidden rounded-3xl border border-dashed border-violet-200 bg-[linear-gradient(180deg,#faf7ff_0%,#fdf2f8_100%)] p-6 sm:p-8">
      <div className="pointer-events-none absolute -top-12 left-1/2 size-48 -translate-x-1/2 rounded-full bg-violet-300/30 blur-3xl" />

      <div className="relative flex flex-col items-center gap-3 text-center">
        <div className="relative">
          <div className="absolute inset-0 -z-10 animate-pulse rounded-2xl bg-[linear-gradient(135deg,#ede9fe,#fce7f3)] blur-xl" />
          <div className="flex size-12 items-center justify-center rounded-2xl bg-brand-gradient-135 text-white shadow-md shadow-violet-300/40">
            <CalendarX className="size-5" />
          </div>
        </div>

        <h3 className="max-w-md text-balance text-xl font-extrabold text-slate-900 sm:text-2xl">
          {tPanels('upcoming.emptyTitle')}
        </h3>
        <p className="max-w-md text-sm leading-6 text-slate-600">
          {tPanels('upcoming.emptyDescription')}
        </p>

        <Button
          onClick={onViewRequests}
          className="group mt-2 h-10 rounded-full bg-brand-gradient px-5 text-xs font-semibold text-white shadow-md shadow-violet-300/40 hover:shadow-lg hover:shadow-violet-400/50"
        >
          <Sparkles className="mr-1.5 size-3.5" />
          {tPanels('upcoming.viewRequests')}
        </Button>
      </div>
    </div>
  );
}

export default function MySchedulePanel({
  upcomingItems,
  pastItems,
  timezoneName,
  lessonChangePeriodHours,
  onRescheduleLesson,
  onCancelLesson,
}: MySchedulePanelProps) {
  const tPanels = useTranslations('Dashboard.mySchedule.panels.lessons');
  const router = useRouter();

  return (
    <div className="ml-0 flex w-full max-w-full flex-col gap-7 lg:max-w-[1032px]">
      <div className="flex flex-col gap-4">
        <SectionHeader
          icon={CalendarPlus}
          accent="from-violet-500 to-purple-500"
          eyebrow={tPanels('upcoming.eyebrow')}
          title={tPanels('upcoming.title')}
          count={upcomingItems.length}
        />

        <div className="flex flex-col gap-2.5">
          {upcomingItems.length > 0 ? (
            upcomingItems.map((item) => (
              <UpcomingScheduleLessonItem
                key={`${item.id}-${item.startAt}`}
                item={item}
                timezoneName={timezoneName}
                lessonChangePeriodHours={lessonChangePeriodHours}
                rescheduleOrCancelLabel={tPanels('upcoming.rescheduleOrCancel')}
                viewDetailLabel={tPanels('upcoming.viewDetail')}
                cancelledLabel={tPanels('upcoming.statusCancelled')}
                onRescheduleLesson={onRescheduleLesson}
                onCancelLesson={onCancelLesson}
              />
            ))
          ) : (
            <EmptyUpcomingCard onViewRequests={() => router.push(ROUTES.DASHBOARD.TRIAL_BOOKING)} />
          )}
        </div>
      </div>

      {pastItems.length > 0 ? (
        <div className="flex flex-col gap-4">
          <SectionHeader
            icon={History}
            accent="from-fuchsia-500 to-rose-500"
            eyebrow={tPanels('past.eyebrow')}
            title={tPanels('past.title')}
            count={pastItems.length}
          />

          <div className="flex flex-col gap-2.5">
            {pastItems.map((item) => (
              <PastScheduleLessonItem
                key={`past-${item.id}-${item.startAt}`}
                item={item}
                timezoneName={timezoneName}
                cancelledLabel={tPanels('past.statusCancelled')}
                viewDetailLabel={tPanels('upcoming.viewDetail')}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
