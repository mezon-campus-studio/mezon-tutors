'use client';

import dayjs from 'dayjs';
import { ArrowDownLeft, ArrowUpRight, Receipt } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { formatToCurrency, ECurrency } from '@mezon-tutors/shared';
import type { WalletTransactionApiItem } from '@mezon-tutors/shared';
import { Badge, Card, CardContent, Skeleton } from '@/components/ui';

type WalletTransactionsListProps = {
  items: WalletTransactionApiItem[];
  isLoading?: boolean;
  variant?: 'cards' | 'ledger';
};

function TransactionRowContent({
  item,
  isCredit,
  label,
  dateLabel,
  creditLabel,
  debitLabel,
  compact,
}: {
  item: WalletTransactionApiItem;
  isCredit: boolean;
  label: string;
  dateLabel: string;
  creditLabel: string;
  debitLabel: string;
  compact?: boolean;
}) {
  const Icon = isCredit ? ArrowDownLeft : ArrowUpRight;
  const iconSize = compact ? 'size-10' : 'size-11';
  const iconClass = compact ? 'size-4' : 'size-5';

  return (
    <>
      <div
        className={`flex ${iconSize} shrink-0 items-center justify-center rounded-xl ${
          isCredit ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
        }`}
      >
        <Icon className={iconClass} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-slate-900">{label}</p>
          <Badge
            variant="outline"
            className={
              isCredit
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-rose-200 bg-rose-50 text-rose-700'
            }
          >
            {isCredit ? creditLabel : debitLabel}
          </Badge>
        </div>
        <p className="mt-0.5 truncate text-sm text-slate-500">
          {item.referenceLabel ?? item.description ?? dateLabel}
        </p>
        <p className="mt-1 text-xs text-slate-400">{dateLabel}</p>
      </div>
      <p
        className={`shrink-0 text-base font-extrabold tabular-nums ${
          isCredit ? 'text-emerald-600' : 'text-rose-600'
        }`}
      >
        {isCredit ? '+' : '−'}
        {formatToCurrency(ECurrency.VND, item.amount)}
      </p>
    </>
  );
}

export default function WalletTransactionsList({
  items,
  isLoading,
  variant = 'cards',
}: WalletTransactionsListProps) {
  const t = useTranslations('Wallet');
  const locale = useLocale();

  if (isLoading) {
    if (variant === 'ledger') {
      return (
        <div className="divide-y divide-slate-100">
          {['a', 'b', 'c', 'd'].map((id) => (
            <div key={id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
              <Skeleton className="size-10 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-5 w-24" />
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {['a', 'b', 'c', 'd'].map((id) => (
          <Card key={id} className="border-violet-100">
            <CardContent className="flex items-center gap-4 p-4">
              <Skeleton className="size-11 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-5 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    const empty = (
      <>
        <div className="flex size-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
          <Receipt className="size-7" />
        </div>
        <div>
          <p className="font-semibold text-slate-900">{t('transactions.emptyTitle')}</p>
          <p className="mt-1 max-w-sm text-sm text-slate-500">
            {t('transactions.emptyDescription')}
          </p>
        </div>
      </>
    );

    if (variant === 'ledger') {
      return (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          {empty}
        </div>
      );
    }

    return (
      <Card className="border-dashed border-violet-200 bg-violet-50/30">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          {empty}
        </CardContent>
      </Card>
    );
  }

  const typeLabels: Record<string, string> = {
    BOOKING_PAYMENT: t('types.BOOKING_PAYMENT'),
    RELEASE: t('types.RELEASE'),
    WITHDRAWAL: t('types.WITHDRAWAL'),
    REFUND: t('types.REFUND'),
    PLATFORM_FEE: t('types.PLATFORM_FEE'),
    LESSON_PAYMENT: t('types.LESSON_PAYMENT'),
    SUBSCRIPTION_PAYMENT: t('types.SUBSCRIPTION_PAYMENT'),
  };

  if (variant === 'ledger') {
    return (
      <div className="divide-y divide-slate-100">
        {items.map((item) => {
          const isCredit = item.direction === 'CREDIT';
          const label = typeLabels[item.type] ?? item.type;
          const dateLabel = dayjs(item.createdAt).locale(locale).format('DD MMM YYYY · HH:mm');

          return (
            <div
              key={item.id}
              className="flex items-center gap-4 py-4 transition-colors first:pt-0 last:pb-0 hover:bg-slate-50/80"
            >
              <TransactionRowContent
                item={item}
                isCredit={isCredit}
                label={label}
                dateLabel={dateLabel}
                creditLabel={t('transactions.credit')}
                debitLabel={t('transactions.debit')}
                compact
              />
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const isCredit = item.direction === 'CREDIT';
        const label = typeLabels[item.type] ?? item.type;
        const dateLabel = dayjs(item.createdAt).locale(locale).format('DD MMM YYYY · HH:mm');

        return (
          <Card
            key={item.id}
            className="border-violet-100 shadow-sm shadow-violet-100/30 transition-shadow hover:shadow-md hover:shadow-violet-100/50"
          >
            <CardContent className="flex items-center gap-4 p-4">
              <TransactionRowContent
                item={item}
                isCredit={isCredit}
                label={label}
                dateLabel={dateLabel}
                creditLabel={t('transactions.credit')}
                debitLabel={t('transactions.debit')}
              />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
