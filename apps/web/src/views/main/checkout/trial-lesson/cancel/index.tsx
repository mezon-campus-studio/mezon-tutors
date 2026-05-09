'use client';

import { AlertCircle, CircleX } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  resolveTrialLessonCancelCodeFromSearchParams,
  ROUTES,
  trialLessonCheckoutCancelIsSoftTone,
} from '@mezon-tutors/shared';

export default function TrialLessonCheckoutCancelPage() {
  const t = useTranslations('TrialLessonCheckout.Result.cancel');
  const searchParams = useSearchParams();

  const outcomeCode = useMemo(() => resolveTrialLessonCancelCodeFromSearchParams(searchParams), [searchParams]);
  const isSoft = trialLessonCheckoutCancelIsSoftTone(outcomeCode);
  const c = useMemo(() => `codes.${outcomeCode}` as const, [outcomeCode]);

  return (
    <div className="relative min-h-screen bg-linear-to-b from-muted/30 via-background to-muted/15">
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0 h-[min(52vh,420px)]',
          !isSoft
            ? 'bg-[radial-gradient(ellipse_75%_55%_at_50%_0%,hsl(var(--destructive)/0.08),transparent)] dark:bg-[radial-gradient(ellipse_75%_55%_at_50%_0%,hsl(var(--destructive)/0.12),transparent)]'
            : 'bg-[radial-gradient(ellipse_75%_55%_at_50%_0%,hsl(38deg_92%_50%/0.07),transparent)] dark:bg-[radial-gradient(ellipse_75%_55%_at_50%_0%,hsl(38deg_85%_55%/0.1),transparent)]'
        )}
      />

      <div className="relative mx-auto flex w-full max-w-4xl flex-col items-stretch px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-14 lg:pb-24">
        <header className="mb-8 flex flex-col items-center gap-5 sm:mb-10 sm:flex-row sm:items-start sm:gap-6">
          <div
            className={cn(
              'flex size-16 shrink-0 items-center justify-center rounded-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] ring-1',
              !isSoft
                ? 'bg-destructive/10 text-destructive ring-destructive/25 dark:bg-destructive/15 dark:ring-destructive/35'
                : 'bg-amber-500/11 text-amber-700 ring-amber-500/25 dark:bg-amber-500/14 dark:text-amber-400 dark:ring-amber-500/30'
            )}
          >
            {!isSoft ? (
              <AlertCircle className="size-9 stroke-[1.75]" aria-hidden />
            ) : (
              <CircleX className="size-9 stroke-[1.75]" aria-hidden />
            )}
          </div>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <Badge
              variant="outline"
              className="mb-3 gap-1.5 border-border/80 bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur-sm"
            >
              {!isSoft ? (
                <AlertCircle className="size-3.5 text-destructive" />
              ) : (
                <CircleX className="size-3.5 text-amber-600 dark:text-amber-400" />
              )}
              {t(`${c}.badge`)}
            </Badge>
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {t(`${c}.title`)}
            </h1>
            <CardDescription className="mt-2 max-w-xl text-pretty text-[15px] leading-relaxed sm:text-base">
              {t(`${c}.description`)}
            </CardDescription>
          </div>
        </header>

        <div className="space-y-5">
          <Card className="gap-0 rounded-2xl border-border/55 bg-muted/25 py-5 shadow-sm sm:py-7">
            <CardHeader className="px-5 pb-0 sm:px-7">
              <CardTitle className="text-base font-semibold sm:text-lg">{t(`${c}.nextStepsTitle`)}</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pt-5 sm:px-7">
              <ul className="space-y-3.5 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                <li className="flex gap-3">
                  <span
                    className={cn(
                      'mt-2 size-1.5 shrink-0 rounded-full',
                      !isSoft
                        ? 'bg-destructive/70 dark:bg-destructive/75'
                        : 'bg-amber-600/75 dark:bg-amber-400/80'
                    )}
                    aria-hidden
                  />
                  {t(`${c}.nextSteps.noCharge`)}
                </li>
                <li className="flex gap-3">
                  <span
                    className={cn(
                      'mt-2 size-1.5 shrink-0 rounded-full',
                      !isSoft
                        ? 'bg-destructive/70 dark:bg-destructive/75'
                        : 'bg-amber-600/75 dark:bg-amber-400/80'
                    )}
                    aria-hidden
                  />
                  {t(`${c}.nextSteps.retry`)}
                </li>
                <li className="flex gap-3">
                  <span
                    className={cn(
                      'mt-2 size-1.5 shrink-0 rounded-full',
                      !isSoft
                        ? 'bg-destructive/70 dark:bg-destructive/75'
                        : 'bg-amber-600/75 dark:bg-amber-400/80'
                    )}
                    aria-hidden
                  />
                  {t(`${c}.nextSteps.mistake`)}
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="gap-0 rounded-2xl border-dashed border-border/55 bg-muted/15 py-0 shadow-none ring-0">
            <CardContent className="px-4 py-6 sm:px-6">
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-3">
                <Link
                  href={ROUTES.HOME.index}
                  className={cn(
                    buttonVariants({ variant: 'outline', size: 'lg' }),
                    'min-h-11 w-full justify-center sm:w-auto sm:min-w-[140px]'
                  )}
                >
                  {t('secondaryCta')}
                </Link>
                <Link
                  href={ROUTES.TUTOR.INDEX}
                  className={cn(
                    buttonVariants({ size: 'lg' }),
                    'min-h-11 w-full justify-center shadow-md sm:w-auto sm:min-w-[220px]'
                  )}
                >
                  {t('primaryCta')}
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
