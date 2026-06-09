'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { googleCalendarQueryKey } from '@/services';

export default function SettingsOAuthHandler() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useTranslations('Settings.googleCalendar');
  const handledRef = useRef(false);

  useEffect(() => {
    const gcalResult = searchParams?.get('gcal');
    if (!gcalResult || handledRef.current) {
      return;
    }

    handledRef.current = true;

    const params = new URLSearchParams(searchParams.toString());
    params.delete('gcal');
    params.delete('reason');
    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;

    if (gcalResult === 'success') {
      void queryClient.invalidateQueries({ queryKey: googleCalendarQueryKey.status() });
      toast.success(t('toast.connectSuccessTitle'), {
        description: t('toast.connectSuccessDescription'),
      });
    } else {
      toast.error(t('toast.connectFailedTitle'), {
        description: t('toast.connectFailedDescription'),
      });
    }

    router.replace(nextUrl || '/dashboard/settings', { scroll: false });
  }, [pathname, queryClient, router, searchParams, t]);

  return null;
}
