'use client';

import { ROUTES } from '@mezon-tutors/shared';
import { CalendarSync } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { useGoogleCalendarStatus } from '@/services';

const SETTINGS_GOOGLE_CALENDAR_HREF = `${ROUTES.DASHBOARD.SETTINGS}?tab=google-calendar`;

type ConnectGoogleCalendarButtonProps = {
  className?: string;
};

export default function ConnectGoogleCalendarButton({
  className,
}: ConnectGoogleCalendarButtonProps) {
  const t = useTranslations('Settings.googleCalendar');
  const { data: status, isPending } = useGoogleCalendarStatus();

  if (isPending || (status?.connected && !status?.needsReconnect)) {
    return null;
  }

  const label = status?.needsReconnect ? t('reconnect') : t('connect');

  return (
    <Link
      href={SETTINGS_GOOGLE_CALENDAR_HREF}
      className={cn(
        'inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-full border border-violet-200 bg-white px-4 text-sm font-semibold text-violet-700 shadow-sm shadow-violet-100/50 transition hover:border-violet-300 hover:bg-violet-50 sm:h-10 sm:w-auto',
        className,
      )}
    >
      <CalendarSync className="size-4 shrink-0" />
      <span className="whitespace-nowrap">{label}</span>
    </Link>
  );
}
