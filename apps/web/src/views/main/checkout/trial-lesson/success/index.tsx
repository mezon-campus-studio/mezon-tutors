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
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Label,
  Separator,
  Skeleton,
  toast,
} from '@/components/ui';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ApiError } from '@/services/api-client';
import { useGetTrialLessonBookingDetail } from '@/services/trial-lesson-booking/trial-lesson-booking.api';
import { isAuthenticatedAtom } from '@/store/auth.atom';
import {
  ECurrency,
  ETrialLessonBookingPaymentStatus,
  MEZON_CHAT_URL,
  ROUTES,
  formatToCurrency,
} from '@mezon-tutors/shared';

function formatLessonSchedule(
  startIso: string,
  durationMinutes: number,
  timeZone: string,
  locale: string
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

function CheckoutSuccessLoadingView({ loadingMessage }: { loadingMessage: string }) {
  return (
    <div className="min-h-screen bg-linear-to-b from-muted/30 via-background to-background px-5 py-12 sm:px-8">
      <Card className="mx-auto max-w-4xl gap-0 border-0 bg-transparent py-0 shadow-none ring-0">
        <CardHeader className="flex flex-row items-center justify-center gap-2 px-0 pb-4 text-sm text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          <CardDescription className="text-sm">{loadingMessage}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-0">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-56 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function TrialLessonCheckoutSuccessPage({ bookingId }: { bookingId: string }) {
  const t = useTranslations('TrialLessonCheckout.Result.successDetail');
  const locale = useLocale();
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const [authHydrated, setAuthHydrated] = useState(false);

  useEffect(() => {
    setAuthHydrated(true);
  }, []);

  const canFetchBooking = authHydrated && Boolean(bookingId) && isAuthenticated;

  const { data, isPending, isError, error, refetch, isFetching } = useGetTrialLessonBookingDetail(
    bookingId,
    canFetchBooking
  );

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
      <div className="flex min-h-[50vh] items-center justify-center px-4 py-10">
        <Card className="w-full max-w-lg text-center shadow-sm">
          <CardHeader>
            <CardDescription>{t('notFound')}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-6">
            <Link
              href={ROUTES.TUTOR.INDEX}
              className={cn(buttonVariants({ size: 'lg' }))}
            >
              {t('ctaTutors')}
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!authHydrated) {
    return <CheckoutSuccessLoadingView loadingMessage={t('loading')} />;
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4 py-10">
        <Card className="w-full max-w-lg text-center shadow-sm">
          <CardHeader className="items-center space-y-4">
            <AlertCircle
              className="size-14 text-amber-500"
              aria-hidden
            />
            <CardTitle className="text-2xl font-bold">{t('unauthorizedTitle')}</CardTitle>
            <CardDescription className="text-base">{t('unauthorizedDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-6">
            <Link
              href={ROUTES.HOME.index}
              className={cn(buttonVariants({ size: 'lg' }))}
            >
              {t('ctaHome')}
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isPending && !data) {
    return <CheckoutSuccessLoadingView loadingMessage={t('loading')} />;
  }

  if (isError && !data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4 py-10">
        <Card className="w-full max-w-lg text-center shadow-sm">
          <CardHeader className="items-center space-y-4">
            <AlertCircle
              className="size-12 text-destructive"
              aria-hidden
            />
            <CardTitle className="text-xl font-semibold">{t('errorTitle')}</CardTitle>
            <CardDescription className="text-base">
              {isUnauthorized
                ? t('unauthorizedDescription')
                : isNotFound
                  ? t('notFound')
                  : t('errorDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap justify-center gap-2 pb-6">
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isFetching}
              type="button"
            >
              {isFetching ? <Loader2 className="size-4 animate-spin" /> : null}
              {t('retry')}
            </Button>
            <Link
              href={ROUTES.TUTOR.INDEX}
              className={cn(buttonVariants({ variant: 'default' }))}
            >
              {t('ctaTutors')}
            </Link>
          </CardContent>
        </Card>
      </div>
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
    <div className="relative min-h-screen bg-linear-to-b from-muted/30 via-background to-muted/15">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[min(52vh,420px)] bg-[radial-gradient(ellipse_75%_55%_at_50%_0%,hsl(var(--primary)/0.09),transparent)]"
      />

      <div className="flex flex-col-reverse pt-5 gap-3 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-3">
        <Link
          href={ROUTES.TUTOR.INDEX}
          className={cn(
            buttonVariants({ variant: 'outline', size: 'lg' }),
            'min-h-11 w-full justify-center sm:w-auto sm:min-w-[180px]'
          )}
        >
          {t('ctaTutors')}
        </Link>
        <Link
          href={ROUTES.MY_LESSONS.INDEX}
          className={cn(
            buttonVariants({ size: 'lg' }),
            'min-h-11 w-full justify-center shadow-md sm:w-auto sm:min-w-[220px]'
          )}
        >
          {t('ctaMyLessons')}
        </Link>
      </div>

      <div className="relative mx-auto flex w-full max-w-4xl flex-col items-stretch px-4 pb-16 pt-5 sm:px-6 sm:pb-20 sm:pt-8 lg:pb-24">
        <header className="mb-8 flex flex-col items-center gap-5 sm:mb-10 sm:flex-row sm:items-start sm:gap-6">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/11 text-emerald-600 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] ring-1 ring-emerald-500/15 dark:bg-emerald-500/12 dark:text-emerald-400 dark:ring-emerald-500/25">
            <CheckCircle2 className="size-9 stroke-[1.75]" />
          </div>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <Badge
              variant="outline"
              className="mb-3 gap-1.5 border-border/80 bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur-sm"
            >
              <Sparkles className="size-3.5 text-primary" />
              {t('newBookingBadge')}
            </Badge>
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {t('headline')}
            </h1>
            <CardDescription className="mt-2 max-w-xl text-pretty text-[15px] leading-relaxed sm:text-base">
              {t('subheadline')}
            </CardDescription>
          </div>
        </header>

        <div className="space-y-5">
          <Card className="w-full gap-0 overflow-hidden rounded-2xl border border-primary bg-card/95 py-0 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.12)] ring-1 ring-black/3 backdrop-blur-sm dark:shadow-black/25 dark:ring-white/4">
            <CardHeader className="gap-4 bg-muted/35 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="min-w-0 flex-1 space-y-1.5 text-left">
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                  {t('bookingRef')}
                </Label>
                <CardTitle className="break-all font-mono text-xs font-normal leading-relaxed text-foreground sm:text-sm">
                  {data.id}
                </CardTitle>
              </div>
              <CardAction className="self-start sm:self-auto">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  type="button"
                  onClick={copyRef}
                >
                  <Copy className="size-4" />
                  {t('copyRef')}
                </Button>
              </CardAction>
            </CardHeader>
          </Card>

          <div className="flex flex-col gap-5 lg:flex-row lg:items-stretch">
            <Card className="w-full min-w-0 gap-0 overflow-hidden rounded-2xl border border-primary bg-card/95 py-0 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.12)] ring-1 ring-black/3 backdrop-blur-sm dark:shadow-black/25 dark:ring-white/4 lg:basis-0 lg:flex-6">
              <CardContent className="grid h-full gap-0 divide-y divide-border/45 p-0 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                <div className="space-y-0 p-5 sm:p-6">
                  <Label className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
                    <Calendar className="size-4" />
                    {t('lessonSection')}
                  </Label>
                  <CardTitle className="text-lg font-semibold leading-snug sm:text-xl">
                    {schedule.dateLine}
                  </CardTitle>
                  <div className="mt-2 flex items-center gap-2 text-primary font-bold">
                    <Clock className="mt-0.5 size-4 shrink-0 opacity-80" />
                    <CardDescription className="text-sm sm:text-base text-primary">
                      {schedule.rangeLine}
                    </CardDescription>
                  </div>
                  <p className="mt-4 text-sm font-medium">
                    {t('durationLabel', { minutes: data.durationMinutes })}
                  </p>
                  <CardDescription className="mt-5 text-xs leading-relaxed">
                    {t('lessonTimezoneCaption', { timezone: data.tutor.timezone || 'UTC' })}
                  </CardDescription>
                </div>

                <div className="space-y-0 bg-muted/20 p-5 sm:bg-muted/25 sm:p-6">
                  <Label className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
                    <CreditCard className="size-4" />
                    {t('paymentSection')}
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={paymentBadgeVariant}>{paymentLabel}</Badge>
                    <Badge variant="outline">{bookingStatusLabel}</Badge>
                  </div>
                  <CardTitle className="mt-5 text-2xl font-bold tabular-nums tracking-tight sm:text-4xl">
                    {amountLabel}
                  </CardTitle>
                  <CardDescription className="mt-1 text-xs">{t('amountPaid')}</CardDescription>
                  {paidAtLabel ? (
                    <CardDescription className="mt-3 text-xs">
                      {t('paidAt')}: {paidAtLabel}
                    </CardDescription>
                  ) : null}
                  {data.paymentStatus === ETrialLessonBookingPaymentStatus.PENDING ? (
                    <Card className="mt-4 gap-0 border-amber-500/25 bg-amber-500/10 py-3 shadow-none ring-0 dark:bg-amber-500/10">
                      <CardContent className="px-3 py-0">
                        <CardDescription className="text-xs leading-relaxed text-amber-950 dark:text-amber-100">
                          {t('pendingPaymentHint')}
                        </CardDescription>
                      </CardContent>
                    </Card>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <Card className="w-full min-w-0 gap-0 rounded-2xl border border-primary bg-card/95 py-5 shadow-[0_6px_24px_-14px_rgba(0,0,0,0.1)] ring-1 ring-black/3 backdrop-blur-sm dark:ring-white/4 sm:py-7 lg:basis-0 lg:flex-4">
              <CardContent className="flex flex-col px-5 sm:px-7">
                <div className="flex min-w-0 gap-4">
                  <Avatar className="size-16 shrink-0 rounded-xl after:rounded-xl **:data-[slot=avatar-image]:rounded-xl **:data-[slot=avatar-fallback]:rounded-xl">
                    {data.tutor.avatarUrl ? (
                      <AvatarImage
                        src={data.tutor.avatarUrl}
                        alt=""
                        className="rounded-xl"
                      />
                    ) : null}
                    <AvatarFallback className="rounded-xl bg-muted/40">
                      <Users className="size-8 text-muted-foreground" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <CardDescription className="text-xs font-semibold uppercase tracking-wide text-primary">
                      {t('tutorSection')}
                    </CardDescription>
                    <CardTitle className="mt-1.5 text-lg font-bold leading-tight">
                      {data.tutor.displayName}
                    </CardTitle>
                  </div>
                </div>

                <Separator className="my-6 bg-border/50" />

                <div className="flex min-w-0 gap-4">
                  <Avatar className="size-16 shrink-0 rounded-xl after:rounded-xl **:data-[slot=avatar-image]:rounded-xl **:data-[slot=avatar-fallback]:rounded-xl">
                    {data.student.avatarUrl ? (
                      <AvatarImage
                        src={data.student.avatarUrl}
                        alt=""
                        className="rounded-xl"
                      />
                    ) : null}
                    <AvatarFallback className="rounded-xl bg-muted/40">
                      <User className="size-8 text-muted-foreground" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <CardDescription className="text-xs font-semibold uppercase tracking-wide text-primary">
                      {t('studentSection')}
                    </CardDescription>
                    <CardTitle className="mt-1.5 text-lg font-bold leading-tight">
                      {data.student.displayName}
                    </CardTitle>
                    <CardDescription className="mt-2 truncate text-sm">
                      {data.student.email}
                    </CardDescription>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="gap-0 rounded-2xl border-border/55 bg-muted/25 py-5 shadow-sm sm:py-7">
            <CardHeader className="px-5 pb-0 sm:px-7">
              <CardTitle className="text-base font-semibold sm:text-lg">{t('tipsTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pt-5 sm:px-7">
              <ul className="space-y-3.5 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                <li className="flex gap-3">
                  <span
                    className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/70"
                    aria-hidden
                  />
                  {t('tips.checkEmail')}
                </li>
                <li className="flex gap-3">
                  <span
                    className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/70"
                    aria-hidden
                  />
                  {t.rich('tips.dm', {
                    brand: (chunks) => (
                      <Link
                        href={MEZON_CHAT_URL}
                        target="_blank"
                        className="font-bold text-primary"
                      >
                        {chunks}
                      </Link>
                    ),
                  })}
                </li>
                <li className="flex gap-3">
                  <span
                    className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/70"
                    aria-hidden
                  />
                  {t('tips.early')}
                </li>
                <li className="flex gap-3">
                  <span
                    className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/70"
                    aria-hidden
                  />
                  {t('tips.policy')}
                </li>
                <li className="flex gap-3">
                  <span
                    className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/70"
                    aria-hidden
                  />
                  {t('tips.support')}
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
