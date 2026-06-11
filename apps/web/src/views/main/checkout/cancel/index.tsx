'use client';

import { AlertCircle, CircleX } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo } from 'react';
import { CardTitle } from '@/components/ui';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { subscriptionApi, trialLessonBookingApi } from '@/services';
import {
  LESSON_CANCEL_REASON_SLOT_CONFLICT,
  LESSON_CHECKOUT_SLOT_UNAVAILABLE_AFTER_PAYMENT_CODE,
  lessonCheckoutCancelIsSoftTone,
  resolveLessonCancelCodeFromSearchParams,
  ROUTES,
} from '@mezon-tutors/shared';
import {
  CheckoutResultCard,
  CheckoutResultHero,
  CheckoutResultShell,
  checkoutGradientButtonClass,
  checkoutOutlineButtonClass,
} from '../components/CheckoutResultLayout';

export default function CheckoutCancelPage() {
  const t = useTranslations('LessonCheckout.Result.cancel');
  const router = useRouter();
  const searchParams = useSearchParams();

  const checkoutType = searchParams.get('type')?.trim();
  const isTrial = checkoutType === 'trial';
  const isSubscription = checkoutType === 'subscription';

  const outcomeCode = useMemo(
    () => resolveLessonCancelCodeFromSearchParams(searchParams),
    [searchParams],
  );
  const isSoft = lessonCheckoutCancelIsSoftTone(outcomeCode);
  const c = useMemo(() => `codes.${outcomeCode}` as const, [outcomeCode]);
  const isSlotUnavailableAfterPayment =
    outcomeCode === LESSON_CHECKOUT_SLOT_UNAVAILABLE_AFTER_PAYMENT_CODE;

  useEffect(() => {
    if (outcomeCode !== 'unknown') {
      return;
    }

    const bookingId = searchParams.get('bookingId')?.trim();
    const enrollmentId = searchParams.get('enrollmentId')?.trim();

    if (bookingId && (!checkoutType || isTrial)) {
      let cancelled = false;
      void trialLessonBookingApi
        .getBookingDetail(bookingId)
        .then((detail) => {
          if (cancelled) {
            return;
          }
          if (detail.cancelReason === LESSON_CANCEL_REASON_SLOT_CONFLICT) {
            router.replace(
              ROUTES.CHECKOUT.CANCEL_WITH_CODE(LESSON_CHECKOUT_SLOT_UNAVAILABLE_AFTER_PAYMENT_CODE, {
                type: 'trial',
                id: bookingId,
              }),
            );
          }
        })
        .catch(() => undefined);
      return () => {
        cancelled = true;
      };
    }

    if (enrollmentId && (!checkoutType || isSubscription)) {
      let cancelled = false;
      void subscriptionApi
        .getEnrollment(enrollmentId)
        .then((detail) => {
          if (cancelled) {
            return;
          }
          if (detail.paymentStatus === 'REFUNDED' && detail.status === 'CANCELLED') {
            router.replace(
              ROUTES.CHECKOUT.CANCEL_WITH_CODE(LESSON_CHECKOUT_SLOT_UNAVAILABLE_AFTER_PAYMENT_CODE, {
                type: 'subscription',
                id: enrollmentId,
              }),
            );
          }
        })
        .catch(() => undefined);
      return () => {
        cancelled = true;
      };
    }
  }, [checkoutType, isSubscription, isTrial, outcomeCode, router, searchParams]);

  return (
    <CheckoutResultShell>
      <CheckoutResultHero
        icon={!isSoft ? AlertCircle : CircleX}
        badge={t(`${c}.badge`)}
        title={t(`${c}.title`)}
        description={t(`${c}.description`)}
        tone={!isSoft ? 'error' : 'warning'}
      />

      <div className="space-y-5">
        <CheckoutResultCard variant="muted">
          <div className="px-5 py-5 sm:px-7 sm:py-7">
            <CardTitle className="text-base font-semibold text-slate-900 sm:text-lg">
              {t(`${c}.nextStepsTitle`)}
            </CardTitle>
            <ul className="mt-5 space-y-3.5 text-sm leading-relaxed text-slate-600 sm:text-[15px]">
              <li className="flex gap-3">
                <span
                  className={cn(
                    'mt-2 size-1.5 shrink-0 rounded-full',
                    !isSoft ? 'bg-rose-500/70' : 'bg-amber-500/70',
                  )}
                  aria-hidden
                />
                {t(`${c}.nextSteps.noCharge`)}
              </li>
              <li className="flex gap-3">
                <span
                  className={cn(
                    'mt-2 size-1.5 shrink-0 rounded-full',
                    !isSoft ? 'bg-rose-500/70' : 'bg-amber-500/70',
                  )}
                  aria-hidden
                />
                {t(`${c}.nextSteps.retry`)}
              </li>
              <li className="flex gap-3">
                <span
                  className={cn(
                    'mt-2 size-1.5 shrink-0 rounded-full',
                    !isSoft ? 'bg-rose-500/70' : 'bg-amber-500/70',
                  )}
                  aria-hidden
                />
                {t(`${c}.nextSteps.mistake`)}
              </li>
            </ul>
          </div>
        </CheckoutResultCard>

        <CheckoutResultCard variant="none">
          <div className="px-4 py-6 sm:px-6">
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-3">
              <Link
                href={ROUTES.HOME.index}
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'lg' }),
                  checkoutOutlineButtonClass,
                  'min-h-11 w-full justify-center sm:w-auto sm:min-w-[140px]',
                )}
              >
                {t('secondaryCta')}
              </Link>
              {isSlotUnavailableAfterPayment ? (
                <>
                  <Link
                    href={ROUTES.DASHBOARD.PENDING_BOOKINGS}
                    className={cn(
                      buttonVariants({ variant: 'outline', size: 'lg' }),
                      checkoutOutlineButtonClass,
                      'min-h-11 w-full justify-center sm:w-auto sm:min-w-[180px]',
                    )}
                  >
                    {t(`${c}.ctaPending`)}
                  </Link>
                  <Link
                    href={ROUTES.DASHBOARD.WALLET}
                    className={cn(
                      buttonVariants({ variant: 'outline', size: 'lg' }),
                      checkoutOutlineButtonClass,
                      'min-h-11 w-full justify-center sm:w-auto sm:min-w-[180px]',
                    )}
                  >
                    {t(`${c}.ctaWallet`)}
                  </Link>
                </>
              ) : null}
              <Link
                href={ROUTES.TUTOR.INDEX}
                className={cn(
                  buttonVariants({ size: 'lg' }),
                  checkoutGradientButtonClass,
                  'min-h-11 w-full justify-center sm:w-auto sm:min-w-[220px]',
                )}
              >
                {t('primaryCta')}
              </Link>
            </div>
          </div>
        </CheckoutResultCard>
      </div>
    </CheckoutResultShell>
  );
}
