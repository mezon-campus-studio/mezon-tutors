'use client';

import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Loader2,
  Sparkles,
  User,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  CardDescription,
  CardTitle,
  Separator,
  toast,
} from '@/components/ui';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ApiError } from '@/services/api-client';
import { useGetTrialLessonBookingDetail } from '@/services/trial-lesson-booking/trial-lesson-booking.api';
import { walletQueryKey } from '@/services/wallet/wallet.qkey';
import { isAuthenticatedAtom } from '@/store/auth.atom';
import {
  ECurrency,
  ETrialLessonBookingPaymentStatus,
  MEZON_CHAT_URL,
  ROUTES,
  LESSON_CANCEL_REASON_SLOT_CONFLICT,
  LESSON_CHECKOUT_SLOT_UNAVAILABLE_AFTER_PAYMENT_CODE,
  formatToCurrency,
} from '@mezon-tutors/shared';
import {
  CheckoutResultActions,
  CheckoutResultCard,
  CheckoutResultEmptyState,
  CheckoutResultHero,
  CheckoutResultLoadingView,
  CheckoutResultSectionLabel,
  CheckoutResultShell,
  checkoutGradientButtonClass,
  checkoutOutlineButtonClass,
} from '../components/CheckoutResultLayout';

function formatLessonSchedule(
  startIso: string,
  durationMinutes: number,
  timeZone: string,
  locale: string,
): { dateLine: string; rangeLine: string } {
  try {
    const start = new Date(startIso);
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
    const tz = timeZone?.trim() || 'UTC';
    const dateLine = new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: tz,
    }).format(start);
    const timeFmt = new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: tz,
    });
    return {
      dateLine,
      rangeLine: `${timeFmt.format(start)} – ${timeFmt.format(end)}`,
    };
  } catch {
    return { dateLine: startIso, rangeLine: '' };
  }
}

function formatPaidAt(iso: string | null, locale: string): string | null {
  if (!iso) {
    return null;
  }
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function TrialLessonSuccessContent({ bookingId }: { bookingId: string }) {
  const t = useTranslations('TrialLessonCheckout.Result.successDetail');
  const locale = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const [authHydrated, setAuthHydrated] = useState(false);

  useEffect(() => {
    setAuthHydrated(true);
  }, []);

  const canFetchBooking = authHydrated && Boolean(bookingId) && isAuthenticated;

  const { data, isPending, isError, error, refetch, isFetching } = useGetTrialLessonBookingDetail(
    bookingId,
    canFetchBooking,
  );

  useEffect(() => {
    if (data?.paymentStatus === ETrialLessonBookingPaymentStatus.SUCCEEDED) {
      void queryClient.invalidateQueries({ queryKey: walletQueryKey.all });
    }
  }, [data?.paymentStatus, queryClient]);

  useEffect(() => {
    if (data?.cancelReason === LESSON_CANCEL_REASON_SLOT_CONFLICT) {
      router.replace(
        ROUTES.CHECKOUT.CANCEL_WITH_CODE(LESSON_CHECKOUT_SLOT_UNAVAILABLE_AFTER_PAYMENT_CODE, {
          type: 'trial',
          id: bookingId,
        }),
      );
    }
  }, [bookingId, data?.cancelReason, router]);

  const schedule = useMemo(() => {
    if (!data) {
      return { dateLine: '', rangeLine: '' };
    }
    return formatLessonSchedule(data.startAt, data.durationMinutes, data.tutor.timezone, locale);
  }, [data, locale]);

  const amountLabel = useMemo(() => {
    if (!data) {
      return '';
    }
    return formatToCurrency(data.currency as ECurrency, data.grossAmount);
  }, [data]);

  const paymentLabel = useMemo(() => {
    if (!data?.paymentStatus) {
      return '';
    }
    switch (data.paymentStatus) {
      case 'SUCCEEDED':
        return t('paymentStatus.SUCCEEDED');
      case 'PENDING':
        return t('paymentStatus.PENDING');
      case 'FAILED':
        return t('paymentStatus.FAILED');
      case 'REFUNDED':
        return t('paymentStatus.REFUNDED');
      default:
        return data.paymentStatus;
    }
  }, [data, t]);

  const bookingStatusLabel = useMemo(() => {
    if (!data?.status) {
      return '';
    }
    switch (data.status) {
      case 'PENDING':
        return t('bookingStatus.PENDING');
      case 'CONFIRMED':
        return t('bookingStatus.CONFIRMED');
      case 'COMPLETED':
        return t('bookingStatus.COMPLETED');
      case 'CANCELLED':
        return t('bookingStatus.CANCELLED');
      default:
        return data.status;
    }
  }, [data, t]);

  const paidAtLabel = formatPaidAt(data?.paidAt ?? null, locale);

  const isUnauthorized = isError && error instanceof ApiError && error.status === 401;
  const isNotFound = isError && error instanceof ApiError && error.status === 404;

  const copyRef = () => {
    if (!data?.id) {
      return;
    }
    void navigator.clipboard.writeText(data.id);
    toast.success(t('copiedToast'));
  };

  if (!bookingId) {
    return (
      <CheckoutResultEmptyState
        description={t('notFound')}
        action={
          <Link href={ROUTES.TUTOR.INDEX} className={cn(buttonVariants({ size: 'lg' }), checkoutGradientButtonClass)}>
            {t('ctaTutors')}
          </Link>
        }
      />
    );
  }

  if (!authHydrated) {
    return <CheckoutResultLoadingView message={t('loading')} />;
  }

  if (!isAuthenticated) {
    return (
      <CheckoutResultShell maxWidth="max-w-lg">
        <CheckoutResultCard className="p-8 text-center">
          <AlertCircle className="mx-auto size-14 text-amber-500" aria-hidden />
          <h1 className="mt-4 text-2xl font-extrabold text-slate-900">{t('unauthorizedTitle')}</h1>
          <p className="mt-2 text-base text-slate-600">{t('unauthorizedDescription')}</p>
          <div className="mt-6 flex justify-center">
            <Link href={ROUTES.HOME.index} className={cn(buttonVariants({ size: 'lg' }), checkoutGradientButtonClass)}>
              {t('ctaHome')}
            </Link>
          </div>
        </CheckoutResultCard>
      </CheckoutResultShell>
    );
  }

  if (isPending && !data) {
    return <CheckoutResultLoadingView message={t('loading')} />;
  }

  if (isError && !data) {
    return (
      <CheckoutResultShell maxWidth="max-w-lg">
        <CheckoutResultCard className="p-8 text-center">
          <AlertCircle className="mx-auto size-12 text-rose-500" aria-hidden />
          <h1 className="mt-4 text-xl font-bold text-slate-900">{t('errorTitle')}</h1>
          <p className="mt-2 text-base text-slate-600">
            {isUnauthorized ? t('unauthorizedDescription') : isNotFound ? t('notFound') : t('errorDescription')}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button variant="outline" onClick={() => refetch()} disabled={isFetching} type="button" className={checkoutOutlineButtonClass}>
              {isFetching ? <Loader2 className="size-4 animate-spin" /> : null}
              {t('retry')}
            </Button>
            <Link href={ROUTES.TUTOR.INDEX} className={cn(buttonVariants({ variant: 'default' }), checkoutGradientButtonClass)}>
              {t('ctaTutors')}
            </Link>
          </div>
        </CheckoutResultCard>
      </CheckoutResultShell>
    );
  }

  if (!data) {
    return null;
  }

  const paymentBadgeVariant =
    data.paymentStatus === ETrialLessonBookingPaymentStatus.SUCCEEDED
      ? 'default'
      : data.paymentStatus === ETrialLessonBookingPaymentStatus.PENDING
        ? 'secondary'
        : 'destructive';

  return (
    <CheckoutResultShell>
      <CheckoutResultHero
        icon={CheckCircle2}
        badge={
          <>
            <Sparkles className="size-3.5" />
            {t('newBookingBadge')}
          </>
        }
        title={t('headline')}
        description={t('subheadline')}
        tone="success"
      />

      <div className="space-y-5">
        <CheckoutResultCard>
          <div className="flex flex-col gap-4 border-b border-violet-100 bg-[linear-gradient(180deg,#faf7ff_0%,#ffffff_100%)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="min-w-0 flex-1 space-y-1.5 text-left">
              <CheckoutResultSectionLabel>{t('bookingRef')}</CheckoutResultSectionLabel>
              <CardTitle className="break-all font-mono text-xs font-normal leading-relaxed text-slate-800 sm:text-sm">
                {data.id}
              </CardTitle>
            </div>
            <Button size="sm" className={cn('gap-2 shrink-0 px-4', checkoutGradientButtonClass)} type="button" onClick={copyRef}>
              <Copy className="size-4" />
              {t('copyRef')}
            </Button>
          </div>
        </CheckoutResultCard>

        <div className="flex flex-col gap-5 lg:flex-row lg:items-stretch">
          <CheckoutResultCard className="lg:flex-[3]">
            <div className="grid h-full gap-0 divide-y divide-violet-100/80 p-0 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
              <div className="space-y-0 p-5 sm:p-6">
                <CheckoutResultSectionLabel icon={Calendar}>{t('lessonSection')}</CheckoutResultSectionLabel>
                <CardTitle className="text-lg font-semibold leading-snug text-slate-900 sm:text-xl">
                  {schedule.dateLine}
                </CardTitle>
                <div className="mt-2 flex items-center gap-2 font-bold text-violet-700">
                  <Clock className="size-4 shrink-0 opacity-80" />
                  <CardDescription className="text-sm text-violet-700 sm:text-base">{schedule.rangeLine}</CardDescription>
                </div>
                <p className="mt-4 text-sm font-medium text-slate-700">
                  {t('durationLabel', { minutes: data.durationMinutes })}
                </p>
                <CardDescription className="mt-5 text-xs leading-relaxed text-slate-500">
                  {t('lessonTimezoneCaption', { timezone: data.tutor.timezone || 'UTC' })}
                </CardDescription>
              </div>

              <div className="space-y-0 bg-violet-50/30 p-5 sm:p-6">
                <CheckoutResultSectionLabel icon={CreditCard}>{t('paymentSection')}</CheckoutResultSectionLabel>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={paymentBadgeVariant}>{paymentLabel}</Badge>
                  <Badge variant="outline">{bookingStatusLabel}</Badge>
                </div>
                <CardTitle className="mt-5 text-2xl font-bold tabular-nums tracking-tight text-slate-900 sm:text-4xl">
                  {amountLabel}
                </CardTitle>
                <CardDescription className="mt-1 text-xs text-slate-500">{t('amountPaid')}</CardDescription>
                {paidAtLabel ? (
                  <CardDescription className="mt-3 text-xs text-slate-500">
                    {t('paidAt')}: {paidAtLabel}
                  </CardDescription>
                ) : null}
                {data.paymentStatus === ETrialLessonBookingPaymentStatus.PENDING ? (
                  <div className="mt-4 rounded-2xl border border-amber-200/60 bg-amber-50/80 px-3 py-3">
                    <CardDescription className="text-xs leading-relaxed text-amber-900">
                      {t('pendingPaymentHint')}
                    </CardDescription>
                  </div>
                ) : null}
              </div>
            </div>
          </CheckoutResultCard>

          <CheckoutResultCard className="lg:flex-[2]">
            <div className="flex flex-col px-5 py-5 sm:px-7 sm:py-7">
              <div className="flex min-w-0 gap-4">
                <Avatar className="size-16 shrink-0 rounded-xl">
                  {data.tutor.avatarUrl ? <AvatarImage src={data.tutor.avatarUrl} alt="" className="rounded-xl" /> : null}
                  <AvatarFallback className="rounded-xl bg-violet-50">
                    <Users className="size-8 text-violet-400" />
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <CheckoutResultSectionLabel>{t('tutorSection')}</CheckoutResultSectionLabel>
                  <CardTitle className="mt-1.5 text-lg font-bold leading-tight text-slate-900">
                    {data.tutor.displayName}
                  </CardTitle>
                </div>
              </div>

              <Separator className="my-6 bg-violet-100/80" />

              <div className="flex min-w-0 gap-4">
                <Avatar className="size-16 shrink-0 rounded-xl">
                  {data.student.avatarUrl ? <AvatarImage src={data.student.avatarUrl} alt="" className="rounded-xl" /> : null}
                  <AvatarFallback className="rounded-xl bg-violet-50">
                    <User className="size-8 text-violet-400" />
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <CheckoutResultSectionLabel>{t('studentSection')}</CheckoutResultSectionLabel>
                  <CardTitle className="mt-1.5 text-lg font-bold leading-tight text-slate-900">
                    {data.student.displayName}
                  </CardTitle>
                  <CardDescription className="mt-2 truncate text-sm text-slate-500">{data.student.email}</CardDescription>
                </div>
              </div>
            </div>
          </CheckoutResultCard>
        </div>

        <CheckoutResultCard variant="muted">
          <div className="px-5 py-5 sm:px-7 sm:py-7">
            <CardTitle className="text-base font-semibold text-slate-900 sm:text-lg">{t('tipsTitle')}</CardTitle>
            <ul className="mt-5 space-y-3.5 text-sm leading-relaxed text-slate-600 sm:text-[15px]">
              <li className="flex gap-3">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-violet-500/70" aria-hidden />
                {t('tips.checkEmail')}
              </li>
              <li className="flex gap-3">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-violet-500/70" aria-hidden />
                {t.rich('tips.dm', {
                  brand: (chunks) => (
                    <Link href={MEZON_CHAT_URL} target="_blank" className="font-bold text-violet-700">
                      {chunks}
                    </Link>
                  ),
                })}
              </li>
              <li className="flex gap-3">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-violet-500/70" aria-hidden />
                {t('tips.early')}
              </li>
              <li className="flex gap-3">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-violet-500/70" aria-hidden />
                {t('tips.policy')}
              </li>
              <li className="flex gap-3">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-violet-500/70" aria-hidden />
                {t('tips.support')}
              </li>
            </ul>
          </div>
        </CheckoutResultCard>

        <CheckoutResultActions>
          <Link
            href={ROUTES.TUTOR.INDEX}
            className={cn(
              buttonVariants({ variant: 'outline', size: 'lg' }),
              checkoutOutlineButtonClass,
              'min-h-11 w-full justify-center sm:w-auto sm:min-w-[180px]',
            )}
          >
            {t('ctaTutors')}
          </Link>
          <Link
            href={ROUTES.DASHBOARD.MY_LESSONS}
            className={cn(
              buttonVariants({ size: 'lg' }),
              checkoutGradientButtonClass,
              'min-h-11 w-full justify-center sm:w-auto sm:min-w-[220px]',
            )}
          >
            {t('ctaMyLessons')}
          </Link>
        </CheckoutResultActions>
      </div>
    </CheckoutResultShell>
  );
}
