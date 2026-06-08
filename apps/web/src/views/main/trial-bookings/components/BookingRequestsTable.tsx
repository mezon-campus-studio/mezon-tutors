'use client';

import {
  ECurrency,
  ETrialLessonBookingStatus,
  formatToCurrency,
  isTrialLessonRescheduleEligible,
} from '@mezon-tutors/shared';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { useAtomValue } from 'jotai';
import { CalendarClock, ClipboardList, Eye, MoreVertical, Trash2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { detectBrowserTimezone, resolveUserTimezone } from '@/lib/timezone';
import { ActionMenu, type ActionMenuItem } from '@/components/common/ActionMenu';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Skeleton,
} from '@/components/ui';
import type { TrialLessonBookingRequestItem } from '@/services';
import { userAtom } from '@/store';
import BookingRequestStatusBadge from './BookingRequestStatusBadge';

type BookingRequestsTableProps = {
  items: TrialLessonBookingRequestItem[];
  isLoading?: boolean;
  isFetching?: boolean;
  lessonChangePeriodHours?: number;
  onViewDetail: (bookingId: string) => void;
  onReschedule: (item: TrialLessonBookingRequestItem) => void;
  onCancel: (item: TrialLessonBookingRequestItem) => void;
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

const formatStartAt = (
  startAt: string,
  durationMinutes: number,
  locale: string,
  timezoneName: string,
) => {
  const start = dayjs(startAt).tz(timezoneName).locale(locale);
  const end = start.add(durationMinutes, 'minute');
  if (!start.isValid()) {
    return { date: '—', time: '—' };
  }
  return {
    date: start.format('ddd, MMM DD'),
    time: `${start.format('HH:mm')} - ${end.format('HH:mm')}`,
  };
};

const normalizeStatus = (status: string) => String(status).toUpperCase();

const isConfirmedTrial = (status: string) =>
  normalizeStatus(status) === ETrialLessonBookingStatus.CONFIRMED;

const isCancelledTrial = (status: string) =>
  normalizeStatus(status) === ETrialLessonBookingStatus.CANCELLED;

function buildActionMenuItems(
  item: TrialLessonBookingRequestItem,
  t: (key: string) => string,
  lessonChangePeriodHours: number | undefined,
  onViewDetail: (bookingId: string) => void,
  onReschedule: (item: TrialLessonBookingRequestItem) => void,
  onCancel: (item: TrialLessonBookingRequestItem) => void,
): ActionMenuItem[] {
  const cancelled = isCancelledTrial(item.status);
  const confirmed = isConfirmedTrial(item.status);

  const items: ActionMenuItem[] = [
    {
      label: t('view'),
      icon: <Eye className="size-4" />,
      onClick: () => onViewDetail(item.id),
    },
  ];

  if (cancelled) {
    items.push({
      label: t('reschedule'),
      icon: <CalendarClock className="size-4" />,
      onClick: () => {},
      disabled: true,
    });
    return items;
  }

  if (confirmed) {
    const canModify =
      lessonChangePeriodHours != null &&
      isTrialLessonRescheduleEligible(item.startAt, new Date(), lessonChangePeriodHours);
    const canReschedule = canModify && !item.rescheduleRequestSubmitted;
    const canCancel = true;
    items.push({
      label: t('reschedule'),
      icon: <CalendarClock className="size-4" />,
      onClick: () => onReschedule(item),
      disabled: !canReschedule,
    });
    items.push({
      label: t('cancel'),
      icon: <Trash2 className="size-4" />,
      onClick: () => onCancel(item),
      disabled: !canCancel,
    });
  }

  return items;
}

type BookingRequestRowProps = {
  item: TrialLessonBookingRequestItem;
  locale: string;
  userTimezone: string;
  lessonChangePeriodHours: number | undefined;
  t: (key: string) => string;
  onViewDetail: (bookingId: string) => void;
  onReschedule: (item: TrialLessonBookingRequestItem) => void;
  onCancel: (item: TrialLessonBookingRequestItem) => void;
};

function BookingRequestRowCard({
  item,
  locale,
  userTimezone,
  lessonChangePeriodHours,
  t,
  onViewDetail,
  onReschedule,
  onCancel,
}: BookingRequestRowProps) {
  const { date, time } = formatStartAt(
    item.startAt,
    item.durationMinutes,
    locale,
    userTimezone,
  );
  const cancelled = isCancelledTrial(item.status);
  const menuItems = buildActionMenuItems(
    item,
    t,
    lessonChangePeriodHours,
    onViewDetail,
    onReschedule,
    onCancel,
  );

  return (
    <article
      className={
        cancelled
          ? 'relative overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-50/60'
          : 'relative overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm shadow-violet-100/30'
      }
    >
      <div className="flex items-start gap-3 p-4">
        <Avatar className="size-11 shrink-0 rounded-xl border border-violet-100">
          {item.studentAvatarUrl ? (
            <AvatarImage
              src={item.studentAvatarUrl}
              alt={item.studentName}
              className="rounded-lg object-cover"
            />
          ) : null}
          <AvatarFallback className="rounded-lg bg-[linear-gradient(135deg,#7c3aed,#ec4899)] text-xs font-bold text-white">
            {getInitials(item.studentName)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1 pr-10">
          <p className="truncate font-semibold text-slate-900">{item.studentName}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {dayjs(item.createdAt).tz(userTimezone).locale(locale).format('MMM DD, YYYY')}
          </p>
        </div>

        <div className="absolute right-3 top-3">
          <ActionMenu
            trigger={
              <Button
                variant="outline"
                size="icon-sm"
                className="size-9 rounded-full border-violet-200 text-violet-700 hover:border-violet-300 hover:bg-violet-50"
                aria-label={t('actions')}
              >
                <MoreVertical className="size-4" />
              </Button>
            }
            items={menuItems}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-violet-50 px-4 py-3 text-sm">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {t('requestedTime')}
          </p>
          <p className="mt-1 font-semibold text-slate-900">{date}</p>
          <p className="text-xs text-slate-500">{time}</p>
        </div>
        <div className="min-w-0 text-right">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {t('rate')}
          </p>
          <p className="mt-1 font-semibold text-violet-700">
            {formatToCurrency(ECurrency.VND, item.tutorAmount)}
          </p>
          <p className="text-xs text-slate-500">{item.durationMinutes} min</p>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-violet-50 px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {t('status')}
        </p>
        <BookingRequestStatusBadge status={item.status} />
      </div>
    </article>
  );
}

export default function BookingRequestsTable({
  items,
  isLoading,
  lessonChangePeriodHours,
  onViewDetail,
  onReschedule,
  onCancel,
}: BookingRequestsTableProps) {
  const t = useTranslations('Dashboard.bookingRequests.table');
  const locale = useLocale();
  const user = useAtomValue(userAtom);
  const userTimezone = resolveUserTimezone(
    user?.timezone,
    detectBrowserTimezone(),
  );

  if (isLoading) {
    return (
      <>
        <div className="space-y-3 lg:hidden">
          {(['r1', 'r2', 'r3', 'r4'] as const).map((slot) => (
            <div
              key={slot}
              className="overflow-hidden rounded-2xl border border-violet-100 bg-white p-4"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="size-11 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="mt-4 h-14 w-full rounded-xl" />
            </div>
          ))}
        </div>

        <div className="hidden overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm shadow-violet-100/40 lg:block">
          {(['r1', 'r2', 'r3', 'r4', 'r5'] as const).map((slot) => (
            <div
              key={slot}
              className="flex items-center gap-4 border-b border-violet-50 p-4 last:border-b-0"
            >
              <Skeleton className="size-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-8 w-24" />
            </div>
          ))}
        </div>
      </>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-violet-200 bg-[linear-gradient(180deg,#faf8ff_0%,#ffffff_100%)] px-4 py-10 text-center sm:py-12">
        <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
          <ClipboardList className="size-6" />
        </div>
        <p className="text-base font-semibold text-slate-800">{t('noResults')}</p>
      </div>
    );
  }

  const rowProps = {
    locale,
    userTimezone,
    lessonChangePeriodHours,
    t,
    onViewDetail,
    onReschedule,
    onCancel,
  };

  return (
    <>
      <div className="space-y-3 lg:hidden">
        {items.map((item) => (
          <BookingRequestRowCard key={item.id} item={item} {...rowProps} />
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm shadow-violet-100/40 lg:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
          <thead className="bg-[linear-gradient(180deg,#faf7ff_0%,#fdf2f8_100%)] text-left text-xs font-bold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-5 py-3">{t('student')}</th>
              <th className="px-5 py-3">{t('requestedTime')}</th>
              <th className="px-5 py-3">{t('rate')}</th>
              <th className="px-5 py-3">{t('status')}</th>
              <th className="px-5 py-3 text-right">{t('actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-violet-50">
            {items.map((item) => {
              const { date, time } = formatStartAt(
                item.startAt,
                item.durationMinutes,
                locale,
                userTimezone,
              );
              const cancelled = isCancelledTrial(item.status);
              const menuItems = buildActionMenuItems(
                item,
                t,
                lessonChangePeriodHours,
                onViewDetail,
                onReschedule,
                onCancel,
              );

              return (
                <tr
                  key={item.id}
                  className={
                    cancelled
                      ? 'bg-slate-50/60 transition-colors hover:bg-slate-50'
                      : 'bg-white transition-colors hover:bg-violet-50/40'
                  }
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-10 rounded-xl border border-violet-100">
                        {item.studentAvatarUrl ? (
                          <AvatarImage
                            src={item.studentAvatarUrl}
                            alt={item.studentName}
                            className="rounded-lg object-cover"
                          />
                        ) : null}
                        <AvatarFallback className="rounded-lg bg-[linear-gradient(135deg,#7c3aed,#ec4899)] text-xs font-bold text-white">
                          {getInitials(item.studentName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900">
                          {item.studentName}
                        </span>
                        <span className="text-xs text-slate-500">
                          {dayjs(item.createdAt)
                            .tz(userTimezone)
                            .locale(locale)
                            .format('MMM DD, YYYY')}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-900">{date}</span>
                      <span className="text-xs text-slate-500">{time}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-col">
                      <span className="font-semibold text-violet-700">
                        {formatToCurrency(ECurrency.VND, item.tutorAmount)}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {item.durationMinutes} min
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <BookingRequestStatusBadge status={item.status} />
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end">
                      <ActionMenu
                        trigger={
                          <Button
                            variant="outline"
                            size="icon-sm"
                            className="rounded-full border-violet-200 text-violet-700 hover:border-violet-300 hover:bg-violet-50"
                            aria-label={t('actions')}
                          >
                            <MoreVertical className="size-4" />
                          </Button>
                        }
                        items={menuItems}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
