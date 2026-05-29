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
import { CalendarClock, CalendarPlus, Clock4, MoreVertical, Sparkles, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { ActionMenu, type ActionMenuItem } from '@/components/common/ActionMenu';
import { Avatar, AvatarFallback, AvatarImage, Badge, Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { TrialLessonBookingRequestItem } from '@/services';
import { mapTutorBookingStatusToUi } from '@/lib/trial-booking-status';

type MyScheduleUpcomingListProps = {
  items: TrialLessonBookingRequestItem[];
  timezoneName: string;
  lessonChangePeriodHours?: number;
  onRescheduleSubscription?: (item: TrialLessonBookingRequestItem) => void;
  onCancelLesson?: (item: TrialLessonBookingRequestItem) => void;
};

dayjs.extend(utc);
dayjs.extend(timezone);

const getInitials = (name?: string) => {
  if (!name) return 'S';
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'S'
  );
};

export default function MyScheduleUpcomingList({
  items,
  timezoneName,
  lessonChangePeriodHours,
  onRescheduleSubscription,
  onCancelLesson,
}: MyScheduleUpcomingListProps) {
  const t = useTranslations('Dashboard.mySchedule.upcoming');
  const tSchedule = useTranslations('Dashboard.mySchedule');
  const locale = useLocale();
  const nowInTimezone = dayjs().tz(timezoneName);

  const buildLessonMenuItems = (
    item: TrialLessonBookingRequestItem,
    isSubscription: boolean,
    isCompleted: boolean,
  ): ActionMenuItem[] => {
    const canModify =
      !isCompleted &&
      lessonChangePeriodHours != null &&
      isTrialLessonRescheduleEligible(item.startAt, nowInTimezone.toDate(), lessonChangePeriodHours);
    const canReschedule =
      isSubscription &&
      canModify &&
      !item.rescheduleRequestSubmitted;
    const canCancel = canModify && !item.cancellationRequestSubmitted;

    const items: ActionMenuItem[] = [];

    if (isSubscription) {
      items.push({
        label: t('reschedule'),
        icon: <CalendarClock className="size-4" />,
        onClick: () => onRescheduleSubscription?.(item),
        disabled: !canReschedule || !onRescheduleSubscription,
      });
    }

    items.push({
      label: t('cancel'),
      icon: <Trash2 className="size-4" />,
      onClick: () => onCancelLesson?.(item),
      disabled: !canCancel || !onCancelLesson,
    });

    return items;
  };

  return (
    <aside className="flex min-h-0 w-full flex-col gap-4 pb-24 pr-1 sm:pr-2">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#7c3aed,#ec4899)] text-white shadow-md shadow-violet-300/40">
          <CalendarPlus className="size-5" />
        </div>
        <div className="leading-tight">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-500">
            {t('eyebrow')}
          </p>
          <h2 className="text-lg font-extrabold text-slate-900 md:text-xl">
            {t('title')}
            {items.length > 0 ? (
              <span className="ml-2 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-violet-100 px-2 text-xs font-bold text-violet-700">
                {items.length}
              </span>
            ) : null}
          </h2>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="relative overflow-hidden rounded-3xl border border-dashed border-violet-200 bg-[linear-gradient(180deg,#faf7ff_0%,#fdf2f8_100%)] p-6">
          <div className="pointer-events-none absolute -top-12 left-1/2 size-48 -translate-x-1/2 rounded-full bg-violet-300/30 blur-3xl" />
          <div className="relative flex flex-col items-center gap-2 text-center">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#7c3aed,#ec4899)] text-white shadow-md shadow-violet-300/40">
              <Sparkles className="size-4" />
            </div>
            <p className="text-base font-extrabold text-slate-900">{t('emptyTitle')}</p>
            <p className="text-xs text-slate-600">{t('emptyDescription')}</p>
          </div>
        </div>
      ) : (
        <div className="max-h-[min(80vh,760px)] min-h-0 space-y-4 overflow-y-auto overflow-x-hidden pb-2 [scrollbar-width:thin]">
          {items.map((item) => {
            const isSubscription = item.scheduleKind === 'subscription';
            const start = dayjs.utc(item.startAt).tz(timezoneName).locale(locale);
            const end = start.add(item.durationMinutes, 'minute');
            const isCompleted =
              end.isBefore(nowInTimezone) || mapTutorBookingStatusToUi(item.status) === 'completed';
            const menuItems = buildLessonMenuItems(item, isSubscription, isCompleted);
            const showActionMenu = !isCompleted && menuItems.length > 0;

            return (
              <div
                key={item.id}
                className={cn(
                  'flex w-full shrink-0 flex-col gap-4 rounded-3xl border bg-white p-5 shadow-sm transition-all hover:shadow-md',
                  isSubscription
                    ? 'border-fuchsia-200/70 bg-linear-to-br from-fuchsia-50/40 via-white to-violet-50/30 hover:border-fuchsia-300/80 hover:shadow-fuchsia-100/50'
                    : 'border-amber-200/70 bg-linear-to-br from-amber-50/35 via-white to-orange-50/25 hover:border-amber-300/80 hover:shadow-amber-100/50',
                  isCompleted && 'opacity-[0.92]'
                )}
              >
                <div className="flex items-start gap-4">
                  <Avatar className="size-14 shrink-0 rounded-2xl border-2 border-white shadow-md ring-1 ring-violet-100">
                    {item.studentAvatarUrl ? (
                      <AvatarImage
                        src={item.studentAvatarUrl}
                        alt={item.studentName}
                        className="rounded-xl object-cover"
                      />
                    ) : null}
                    <AvatarFallback className="rounded-xl bg-linear-to-br from-violet-600 to-fuchsia-600 text-sm font-bold text-white">
                      {getInitials(item.studentName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <Badge
                          variant="secondary"
                          className={cn(
                            'shrink-0 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                            isSubscription
                              ? 'border-fuchsia-200/80 bg-fuchsia-100 text-fuchsia-900'
                              : 'border-amber-200/80 bg-amber-100 text-amber-950'
                          )}
                        >
                          {isSubscription
                            ? tSchedule('lessonTypePlan')
                            : tSchedule('lessonTypeTrial')}
                        </Badge>
                        {isCompleted ? (
                          <Badge
                            variant="outline"
                            className="shrink-0 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600"
                          >
                            {tSchedule('completedBadge')}
                          </Badge>
                        ) : null}
                      </div>
                      {showActionMenu ? (
                        <ActionMenu
                          items={menuItems}
                          trigger={
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="size-8 shrink-0 rounded-full text-slate-500 hover:bg-violet-50 hover:text-violet-700"
                              aria-label={t('cancel')}
                            >
                              <MoreVertical className="size-4" />
                            </Button>
                          }
                        />
                      ) : null}
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-violet-600">
                        {start.format('ddd, MMM DD')}
                      </p>
                      <p className="mt-0.5 text-lg font-extrabold tabular-nums tracking-tight text-slate-900">
                        {start.format('HH:mm')} – {end.format('HH:mm')}
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-slate-800">
                        {item.studentName}
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className={cn(
                    'flex flex-wrap items-center gap-3 border-t border-violet-100/80 pt-4',
                    !isSubscription && 'justify-between'
                  )}
                >
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 ring-1 ring-emerald-100">
                    <Clock4 className="size-3.5 shrink-0" />
                    {t('durationLabel', { minutes: item.durationMinutes })}
                  </div>
                  {!isSubscription ? (
                    <span className="max-w-[55%] shrink-0 truncate text-right text-sm font-extrabold text-violet-700">
                      {formatToCurrency(ECurrency.VND, item.tutorAmount)}
                    </span>
                  ) : null}
                </div>

                {!isSubscription ? (
                  <div className="mt-auto flex shrink-0">
                    <Link
                      href={ROUTES.DASHBOARD.TRIAL_BOOKING_DETAIL(item.id)}
                      className="w-full"
                    >
                      <Button
                        variant="outline"
                        className="h-10 w-full rounded-full border-slate-200 text-xs font-semibold text-slate-700 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-800"
                      >
                        {t('viewDetail')}
                      </Button>
                    </Link>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
}
