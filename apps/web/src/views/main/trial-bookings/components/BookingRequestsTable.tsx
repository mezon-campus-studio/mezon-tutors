'use client';

import { ECurrency, ETrialLessonBookingStatus, formatToCurrency } from '@mezon-tutors/shared';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { useAtomValue } from 'jotai';
import { CalendarClock, Eye, MoreVertical } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { detectBrowserTimezone, resolveUserTimezone } from '@/lib/timezone';
import { isTrialLessonRescheduleEligible } from '@/lib/trial-lesson-cancellation';
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
  onViewDetail: (bookingId: string) => void;
  onReschedule: (item: TrialLessonBookingRequestItem) => void;
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
  onViewDetail: (bookingId: string) => void,
  onReschedule: (item: TrialLessonBookingRequestItem) => void,
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
    const canReschedule =
      isTrialLessonRescheduleEligible(item.startAt) && !item.rescheduleRequestSubmitted;
    items.push({
      label: t('reschedule'),
      icon: <CalendarClock className="size-4" />,
      onClick: () => onReschedule(item),
      disabled: !canReschedule,
    });
  }

  return items;
}

export default function BookingRequestsTable({
  items,
  isLoading,
  onViewDetail,
  onReschedule,
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
      <div className="overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm shadow-violet-100/40">
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
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-violet-200 bg-white p-12 text-center text-sm text-slate-500">
        {t('noResults')}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm shadow-violet-100/40">
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
                onViewDetail,
                onReschedule,
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
  );
}
