'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import {
  mapTutorBookingStatusToUi,
  type TutorBookingRequestUiStatus,
} from '@/lib/trial-booking-status';

const STATUS_CLASS: Record<TutorBookingRequestUiStatus, string> = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  confirmed: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200',
  completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  cancelled: 'bg-slate-100 text-slate-600 border-slate-200',
};

type BookingRequestStatusBadgeProps = {
  status: string;
  className?: string;
};

export default function BookingRequestStatusBadge({
  status,
  className,
}: BookingRequestStatusBadgeProps) {
  const t = useTranslations('Dashboard.bookingRequests.status');
  const ui = mapTutorBookingStatusToUi(status);
  const cls = STATUS_CLASS[ui];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        cls,
        className,
      )}
    >
      {t(ui)}
    </span>
  );
}
