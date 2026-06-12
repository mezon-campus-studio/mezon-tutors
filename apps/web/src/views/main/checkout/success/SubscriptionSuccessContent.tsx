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
import { useGetSubscriptionEnrollment } from '@/services';
import { walletQueryKey } from '@/services/wallet/wallet.qkey';
import { isAuthenticatedAtom, userAtom } from '@/store/auth.atom';
import {
  ECurrency,
  LESSON_CHECKOUT_SLOT_UNAVAILABLE_AFTER_PAYMENT_CODE,
  MEZON_CHAT_URL,
  ROUTES,
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
import { mergeSubscriptionWeeklySlots } from '../utils/format-subscription-schedule';

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

export default function SubscriptionSuccessContent({ enrollmentId }: { enrollmentId: string }) {
  const t = useTranslations('SubscriptionCheckout.Result.subscriptionSuccess');
  const locale = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const authUser = useAtomValue(userAtom);
  const [authHydrated, setAuthHydrated] = useState(false);

  useEffect(() => {
    setAuthHydrated(true);
  }, []);

  const canFetch = authHydrated && Boolean(enrollmentId) && isAuthenticated;
  const { data, isPending, isError, error, refetch, isFetching } = useGetSubscriptionEnrollment(
    enrollmentId,
    canFetch,
  );

  useEffect(() => {
    if (data?.paymentStatus === 'SUCCEEDED') {
      void queryClient.invalidateQueries({ queryKey: walletQueryKey.all });
    }
  }, [data?.paymentStatus, queryClient]);

  useEffect(() => {
    if (data?.paymentStatus === 'REFUNDED' && data?.status === 'CANCELLED') {
      router.replace(
        ROUTES.CHECKOUT.CANCEL_WITH_CODE(LESSON_CHECKOUT_SLOT_UNAVAILABLE_AFTER_PAYMENT_CODE, {
          type: 'subscription',
          id: enrollmentId,
        }),
      );
    }
  }, [data?.paymentStatus, data?.status, enrollmentId, router]);

  const displayTimezone = data?.tutor.timezone?.trim() || 'UTC';

  const mergedSchedule = useMemo(() => {
    if (!data?.weeklySlots?.length) {
      return [];
    }
    return mergeSubscriptionWeeklySlots(data.weeklySlots, locale, displayTimezone);
  }, [data?.weeklySlots, displayTimezone, locale]);

  const slotDurationMinutes = mergedSchedule[0]?.durationMinutes ?? data?.weeklySlots?.[0]?.durationMinutes ?? 60;

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

  const enrollmentStatusLabel = useMemo(() => {
    if (!data?.status) {
      return '';
    }
    switch (data.status) {
      case 'PENDING_PAYMENT':
        return t('enrollmentStatus.PENDING_PAYMENT');
      case 'ACTIVE':
        return t('enrollmentStatus.ACTIVE');
      case 'CANCELLED':
        return t('enrollmentStatus.CANCELLED');
      default:
        return data.status;
    }
  }, [data, t]);

  const paidAtLabel = formatPaidAt(data?.paidAt ?? null, locale);
  const studentDisplayName = authUser?.username?.trim() || authUser?.email?.trim() || '—';
  const isUnauthorized = isError && error instanceof ApiError && error.status === 401;
  const isNotFound = isError && error instanceof ApiError && error.status === 404;

  const copyRef = () => {
    if (!data?.id) {
      return;
    }
    void navigator.clipboard.writeText(data.id);
    toast.success(t('copiedToast'));
  };

  if (!enrollmentId) {
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
          <CheckoutResultActions>
            <Link href={ROUTES.HOME.index} className={cn(buttonVariants({ size: 'lg' }), checkoutGradientButtonClass)}>
              {t('ctaHome')}
            </Link>
          </CheckoutResultActions>
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
          <CheckoutResultActions>
            <Button variant="outline" onClick={() => refetch()} disabled={isFetching} type="button" className={checkoutOutlineButtonClass}>
              {isFetching ? <Loader2 className="size-4 animate-spin" /> : null}
              {t('retry')}
            </Button>
            <Link href={ROUTES.TUTOR.INDEX} className={cn(buttonVariants({ variant: 'default' }), checkoutGradientButtonClass)}>
              {t('ctaTutors')}
            </Link>
          </CheckoutResultActions>
        </CheckoutResultCard>
      </CheckoutResultShell>
    );
  }

  if (!data) {
    return null;
  }

  const paymentBadgeVariant =
    data.paymentStatus === 'SUCCEEDED'
      ? 'default'
      : data.paymentStatus === 'PENDING'
        ? 'secondary'
        : 'destructive';

  return (
    <CheckoutResultShell>
      <CheckoutResultHero
        icon={CheckCircle2}
        badge={
          <>
            <Sparkles className="size-3.5" />
            {t('badge')}
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
              <CheckoutResultSectionLabel>{t('enrollmentRef')}</CheckoutResultSectionLabel>
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
          <CheckoutResultCard className="lg:flex-3">
            <div className="grid h-full gap-0 divide-y divide-violet-100/80 p-0 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
              <div className="space-y-0 p-5 sm:p-6">
                <CheckoutResultSectionLabel icon={Calendar}>{t('lessonSection')}</CheckoutResultSectionLabel>

                {mergedSchedule.length === 1 ? (
                  <>
                    <CardTitle className="text-lg font-semibold leading-snug text-slate-900 sm:text-xl">
                      {mergedSchedule[0].daysLine}
                    </CardTitle>
                    <div className="mt-2 flex items-center gap-2 font-bold text-violet-700">
                      <Clock className="size-4 shrink-0 opacity-80" />
                      <CardDescription className="text-sm text-violet-700 sm:text-base">
                        {mergedSchedule[0].rangeLine}
                      </CardDescription>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    {mergedSchedule.map((group) => (
                      <div key={`${group.daysLine}-${group.rangeLine}`}>
                        <CardTitle className="text-base font-semibold leading-snug text-slate-900 sm:text-lg">
                          {group.daysLine}
                        </CardTitle>
                        <div className="mt-1.5 flex items-center gap-2 font-bold text-violet-700">
                          <Clock className="size-4 shrink-0 opacity-80" />
                          <CardDescription className="text-sm text-violet-700 sm:text-base">
                            {group.rangeLine}
                          </CardDescription>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <p className="mt-4 text-sm font-medium text-slate-700">
                  {t('lessonsPerWeekLabel', { n: data.lessonsPerWeek })}
                  {' · '}
                  {t('durationLabel', { minutes: slotDurationMinutes })}
                </p>
              </div>

              <div className="space-y-0 bg-violet-50/30 p-5 sm:p-6">
                <CheckoutResultSectionLabel icon={CreditCard}>{t('paymentSection')}</CheckoutResultSectionLabel>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={paymentBadgeVariant}>{paymentLabel}</Badge>
                  <Badge variant="outline">{enrollmentStatusLabel}</Badge>
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
                {data.paymentStatus === 'PENDING' ? (
                  <div className="mt-4 rounded-2xl border border-amber-200/60 bg-amber-50/80 px-3 py-3">
                    <CardDescription className="text-xs leading-relaxed text-amber-900">
                      {t('pendingPaymentHint')}
                    </CardDescription>
                  </div>
                ) : null}
              </div>
            </div>
          </CheckoutResultCard>

          <CheckoutResultCard className="lg:flex-2">
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
                  {authUser?.avatar ? <AvatarImage src={authUser.avatar} alt="" className="rounded-xl" /> : null}
                  <AvatarFallback className="rounded-xl bg-violet-50">
                    <User className="size-8 text-violet-400" />
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <CheckoutResultSectionLabel>{t('studentSection')}</CheckoutResultSectionLabel>
                  <CardTitle className="mt-1.5 text-lg font-bold leading-tight text-slate-900">
                    {studentDisplayName}
                  </CardTitle>
                  {authUser?.email ? (
                    <CardDescription className="mt-2 truncate text-sm text-slate-500">{authUser.email}</CardDescription>
                  ) : null}
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
