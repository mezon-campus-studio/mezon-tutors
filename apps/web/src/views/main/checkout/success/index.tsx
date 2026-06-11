'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ROUTES } from '@mezon-tutors/shared';
import TrialLessonSuccessContent from './TrialLessonSuccessContent';
import SubscriptionSuccessContent from './SubscriptionSuccessContent';
import {
  CheckoutResultCard,
  CheckoutResultShell,
  checkoutGradientButtonClass,
} from '../components/CheckoutResultLayout';

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const t = useTranslations('TrialLessonCheckout.Result.successDetail');

  const type = searchParams.get('type')?.trim();
  const bookingId = searchParams.get('bookingId')?.trim() ?? '';
  const enrollmentId = searchParams.get('enrollmentId')?.trim() ?? '';

  if (type === 'trial') {
    return <TrialLessonSuccessContent bookingId={bookingId} />;
  }

  if (type === 'subscription') {
    return <SubscriptionSuccessContent enrollmentId={enrollmentId} />;
  }

  return (
    <CheckoutResultShell maxWidth="max-w-lg">
      <CheckoutResultCard className="p-8 text-center">
        <p className="text-base text-slate-600">{t('notFound')}</p>
        <div className="mt-6 flex justify-center">
          <Link href={ROUTES.TUTOR.INDEX} className={cn(buttonVariants({ size: 'lg' }), checkoutGradientButtonClass)}>
            {t('ctaTutors')}
          </Link>
        </div>
      </CheckoutResultCard>
    </CheckoutResultShell>
  );
}
