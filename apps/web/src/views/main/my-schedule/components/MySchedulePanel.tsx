'use client';

import {
  ECurrency,
  ROUTES,
  formatToCurrency,
  isTrialLessonRescheduleEligible,
} from '@mezon-tutors/shared';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import {
  CalendarClock,
  CalendarPlus,
  CalendarX,
  History,
  Info,
  MoreVertical,
  Sparkles,
  Trash2,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { ActionMenu } from '@/components/common/ActionMenu';
import { formatLessonDateLabel } from '@/components/calendar/utils/format-locale';
import { Badge, Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { mapTutorBookingStatusToUi } from '@/lib/trial-booking-status';
import type { TrialLessonBookingRequestItem } from '@/services';

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

type LessonStatusTone = 'completed' | 'cancelled' | 'reschedulePending' | 'cancellationPending';

const LESSON_STATUS_BADGE_STYLES: Record<LessonStatusTone, string> = {
  completed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  cancelled: 'bg-rose-50 text-rose-700 ring-rose-200',
  reschedulePending: 'bg-amber-50 text-amber-700 ring-amber-200',
  cancellationPending: 'bg-orange-50 text-orange-700 ring-orange-200',
};

function LessonStatusBadge({ label, tone }: { label: string; tone: LessonStatusTone }) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        'h-9 shrink-0 rounded-full border-0 px-4 text-xs font-bold ring-1',
        LESSON_STATUS_BADGE_STYLES[tone],
      )}
    >
      {label}
    </Badge>
  );
}

type LessonNoticeTone = 'warning' | 'info';

const LESSON_NOTICE_STYLES: Record<
  LessonNoticeTone,
  { container: string; icon: string; text: string }
> = {
  warning: {
    container: 'border-amber-100 bg-amber-50/70',
    icon: 'text-amber-500',
    text: 'text-amber-700',
  },
  info: {
    container: 'border-sky-100 bg-sky-50/70',
    icon: 'text-sky-500',
    text: 'text-sky-700',
  },
};

function LessonNotice({ message, tone }: { message: string; tone: LessonNoticeTone }) {
  const styles = LESSON_NOTICE_STYLES[tone];
  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-b-2xl border-t px-5 py-3',
        styles.container,
      )}
    >
      <Info className={cn('mt-0.5 size-3.5 shrink-0', styles.icon)} />
      <p className={cn('text-xs leading-relaxed', styles.text)}>{message}</p>
    </div>
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
    <div className="size-14 shrink-0 overflow-hidden rounded-2xl ring-2 ring-white shadow-sm shadow-violet-200/40">
      {avatar ? (
        <Image
          src={avatar}
          alt={name}
          width={56}
          height={56}
          className="size-full object-cover"
        />
      ) : (
        <div className="flex size-full items-center justify-center bg-gradient-to-br from-violet-600 to-fuchsia-600 text-sm font-bold text-white">
          {initials}
        </div>
      )}
    </div>
  );
}

type ScheduleLessonRowProps = {
  item: TrialLessonBookingRequestItem;
  timezoneName: string;
  lessonChangePeriodHours?: number;
  isPast?: boolean;
  onRescheduleLesson?: (item: TrialLessonBookingRequestItem) => void;
  onCancelLesson?: (item: TrialLessonBookingRequestItem) => void;
};

function ScheduleLessonRow({
  item,
  timezoneName,
  lessonChangePeriodHours,
  isPast = false,
  onRescheduleLesson,
  onCancelLesson,
}: ScheduleLessonRowProps) {
  const t = useTranslations('Dashboard.mySchedule');
  const tPanels = useTranslations('Dashboard.mySchedule.panels.lessons');
  const locale = useLocale();
  const nowInTimezone = dayjs().tz(timezoneName);

  const isSubscription = item.scheduleKind === 'subscription';
  const start = dayjs.utc(item.startAt).tz(timezoneName).locale(locale);
  const end = start.add(item.durationMinutes, 'minute');
  const uiStatus = mapTutorBookingStatusToUi(item.status);
  const isCancelled = uiStatus === 'cancelled';
  const isCompleted =
    !isCancelled &&
    (isPast ||
      end.isBefore(nowInTimezone) ||
      uiStatus === 'completed');

  const withinChangePeriod =
    lessonChangePeriodHours != null &&
    Boolean(item.startAt) &&
    !isTrialLessonRescheduleEligible(
      item.startAt,
      nowInTimezone.toDate(),
      lessonChangePeriodHours,
    );

  const canReschedule =
    !isCancelled && !isCompleted && !withinChangePeriod && !item.rescheduleRequestSubmitted;
  const canCancel =
    !isCancelled && !isCompleted && !item.cancellationRequestSubmitted;

  const isUpcomingLesson = !isPast && !isCancelled && !isCompleted;

  const showRescheduleNotice =
    isUpcomingLesson &&
    !item.rescheduleRequestSubmitted &&
    !item.cancellationRequestSubmitted &&
    withinChangePeriod;

  const showReschedulePendingNotice =
    isUpcomingLesson &&
    item.rescheduleRequestSubmitted &&
    !item.cancellationRequestSubmitted;

  const showCancellationPendingNotice =
    isUpcomingLesson && item.cancellationRequestSubmitted;

  const lessonTypeLabel = isSubscription ? t('lessonTypePlan') : t('lessonTypeTrial');

  const menuItems = [
    {
      label: tPanels('upcoming.reschedule'),
      icon: <CalendarClock className="size-4" />,
      onClick: () => onRescheduleLesson?.(item),
      disabled: !canReschedule || !onRescheduleLesson,
    },
    {
      label: tPanels('upcoming.cancel'),
      icon: <Trash2 className="size-4 text-destructive" />,
      onClick: () => onCancelLesson?.(item),
      disabled: !canCancel || !onCancelLesson,
      variant: 'destructive' as const,
    },
  ];

  const hasFooterNotice =
    showRescheduleNotice || showReschedulePendingNotice || showCancellationPendingNotice;

  return (
    <div
      className={cn(
        'group flex w-full flex-col gap-0 overflow-hidden rounded-2xl border bg-white transition-all hover:shadow-md',
        isCancelled
          ? 'border-rose-100/90 bg-rose-50/20 hover:border-rose-200 hover:shadow-rose-100/40'
          : isCompleted
            ? 'border-emerald-100/80 bg-emerald-50/15 hover:border-emerald-200 hover:shadow-emerald-100/30'
            : 'border-violet-100 hover:border-violet-200 hover:shadow-violet-100/40',
      )}
    >
      <div
        className={cn(
          'flex w-full flex-wrap items-center justify-between gap-4 px-5 py-4',
          hasFooterNotice && 'pb-4',
        )}
      >
      <div className="flex min-w-[220px] flex-1 items-center gap-3">
        <LessonPersonBadge
          name={item.studentName}
          avatar={item.studentAvatarUrl}
        />
        <div className="flex flex-col gap-0.5">
          <p className="text-xs font-semibold text-slate-500">
            {formatLessonDateLabel(start.format('ddd, MMM DD'), locale)}
          </p>
          <p className="text-lg font-extrabold leading-none text-slate-900">
            {start.format('HH:mm')} – {end.format('HH:mm')}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            <span className="font-semibold text-violet-700">{lessonTypeLabel}</span>
            <span className="mx-1.5 text-slate-300">·</span>
            <span>{item.studentName}</span>
          </p>
        </div>
      </div>

      <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
        {isCancelled ? (
          <LessonStatusBadge label={tPanels('status.cancelled')} tone="cancelled" />
        ) : isCompleted ? (
          <LessonStatusBadge label={t('completedBadge')} tone="completed" />
        ) : (
          <>
            {item.rescheduleRequestSubmitted ? (
              <LessonStatusBadge
                label={tPanels('status.reschedulePending')}
                tone="reschedulePending"
              />
            ) : null}
            {item.cancellationRequestSubmitted ? (
              <LessonStatusBadge
                label={tPanels('status.cancellationPending')}
                tone="cancellationPending"
              />
            ) : null}
            {!isSubscription && item.tutorAmount > 0 ? (
              <span className="text-sm font-extrabold text-violet-700">
                {formatToCurrency(ECurrency.VND, item.tutorAmount)}
              </span>
            ) : null}
          </>
        )}
        {!isSubscription ? (
          <Link href={ROUTES.DASHBOARD.TRIAL_BOOKING_DETAIL(item.id)}>
            <Button
              variant="outline"
              className="h-9 rounded-full border-violet-200 px-4 text-xs font-semibold text-violet-700 hover:border-violet-300 hover:bg-violet-50"
            >
              {tPanels('upcoming.viewDetail')}
            </Button>
          </Link>
        ) : null}
        {isUpcomingLesson ? (
          <ActionMenu
            items={menuItems}
            trigger={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-8 shrink-0 rounded-full text-slate-500 hover:bg-violet-50 hover:text-violet-700"
                aria-label={tPanels('upcoming.manageLesson')}
              >
                <MoreVertical className="size-4" />
              </Button>
            }
          />
        ) : null}
      </div>
      </div>

      {showRescheduleNotice ? (
        <LessonNotice
          tone="warning"
          message={tPanels('upcoming.rescheduleNotice', {
            hours: lessonChangePeriodHours ?? 12,
          })}
        />
      ) : null}

      {showReschedulePendingNotice ? (
        <LessonNotice
          tone="info"
          message={tPanels('upcoming.reschedulePendingNotice')}
        />
      ) : null}

      {showCancellationPendingNotice ? (
        <LessonNotice
          tone="info"
          message={tPanels('upcoming.cancellationPendingNotice')}
        />
      ) : null}
    </div>
  );
}

type EmptyUpcomingCardProps = {
  onViewRequests: () => void;
};

function EmptyUpcomingCard({ onViewRequests }: EmptyUpcomingCardProps) {
  const tPanels = useTranslations('Dashboard.mySchedule.panels.lessons');

  return (
    <div className="relative w-full overflow-hidden rounded-3xl border border-dashed border-violet-200 bg-[linear-gradient(180deg,#faf7ff_0%,#fdf2f8_100%)] p-8">
      <div className="pointer-events-none absolute -top-12 left-1/2 size-48 -translate-x-1/2 rounded-full bg-violet-300/30 blur-3xl" />

      <div className="relative flex flex-col items-center gap-3 text-center">
        <div className="relative">
          <div className="absolute inset-0 -z-10 animate-pulse rounded-2xl bg-[linear-gradient(135deg,#ede9fe,#fce7f3)] blur-xl" />
          <div className="flex size-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#7c3aed,#ec4899)] text-white shadow-md shadow-violet-300/40">
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
          className="group mt-2 h-10 rounded-full bg-[linear-gradient(110deg,#7c3aed_0%,#9333ea_50%,#db2777_100%)] px-5 text-xs font-semibold text-white shadow-md shadow-violet-300/40 hover:shadow-lg hover:shadow-violet-400/50"
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
    <div className="ml-0 flex w-full max-w-[1032px] flex-col gap-7">
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
              <ScheduleLessonRow
                key={`${item.id}-${item.startAt}`}
                item={item}
                timezoneName={timezoneName}
                lessonChangePeriodHours={lessonChangePeriodHours}
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
              <ScheduleLessonRow
                key={`past-${item.id}-${item.startAt}`}
                item={item}
                timezoneName={timezoneName}
                isPast
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
