'use client';

import { useTranslations } from 'next-intl';
import {
  ECurrency,
  formatToCurrency,
  type WalletTransactionApiItem,
} from '@mezon-tutors/shared';
import { cn } from '@/lib/utils';

type WalletTransactionPlatformFeeLineProps = {
  item: WalletTransactionApiItem;
  variant?: 'compact' | 'full';
  className?: string;
};

export default function WalletTransactionPlatformFeeLine({
  item,
  variant = 'compact',
  className,
}: WalletTransactionPlatformFeeLineProps) {
  const t = useTranslations('Wallet');

  const isStudentLessonPayment =
    item.type === 'BOOKING_PAYMENT' && item.direction === 'CREDIT';

  if (!isStudentLessonPayment || item.platformFee == null || item.platformFee <= 0) {
    return null;
  }

  const amountLabel = formatToCurrency(ECurrency.VND, item.platformFee);

  if (variant === 'compact') {
    return (
      <p
        className={cn(
          'text-[10px] font-semibold tabular-nums leading-tight text-violet-500',
          className,
        )}
      >
        {t('transactions.platformFeeCompact', { amount: amountLabel })}
      </p>
    );
  }

  return (
    <p className={cn('mt-0.5 text-xs text-violet-600/90', className)}>
      {t('transactions.platformFee', { amount: amountLabel })}
    </p>
  );
}
