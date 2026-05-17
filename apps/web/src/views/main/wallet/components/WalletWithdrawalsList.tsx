'use client';

import dayjs from 'dayjs';
import { Building2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { formatToCurrency, ECurrency } from '@mezon-tutors/shared';
import type { WalletWithdrawalApiItem, WalletWithdrawalStatus } from '@mezon-tutors/shared';
import { Badge, Card, CardContent, Skeleton } from '@/components/ui';

const STATUS_STYLES: Record<WalletWithdrawalStatus, string> = {
  PENDING: 'border-amber-200 bg-amber-50 text-amber-800',
  APPROVED: 'border-sky-200 bg-sky-50 text-sky-800',
  PROCESSING: 'border-violet-200 bg-violet-50 text-violet-800',
  COMPLETED: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  REJECTED: 'border-rose-200 bg-rose-50 text-rose-800',
};

type WalletWithdrawalsListProps = {
  items: WalletWithdrawalApiItem[];
  isLoading?: boolean;
};

export default function WalletWithdrawalsList({
  items,
  isLoading,
}: WalletWithdrawalsListProps) {
  const t = useTranslations('Wallet.withdrawals');
  const locale = useLocale();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {['a', 'b'].map((id) => (
          <Card key={id} className="border-violet-100">
            <CardContent className="p-4">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="mt-3 h-4 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <Card className="border-dashed border-violet-200 bg-violet-50/30">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
            <Building2 className="size-7" />
          </div>
          <p className="font-semibold text-slate-900">{t('emptyTitle')}</p>
          <p className="max-w-sm text-sm text-slate-500">{t('emptyDescription')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const dateLabel = dayjs(item.createdAt).locale(locale).format('DD MMM YYYY · HH:mm');
        const maskedAccount = `•••• ${item.bankAccountNumber.slice(-4)}`;

        return (
          <Card key={item.id} className="border-violet-100 shadow-sm shadow-violet-100/30">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-extrabold tabular-nums text-rose-600">
                    −{formatToCurrency(ECurrency.VND, item.amount)}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {t('bank')}: {item.bankName} · {maskedAccount}
                  </p>
                  <p className="text-sm text-slate-500">{item.bankAccountName}</p>
                  <p className="mt-2 text-xs text-slate-400">{dateLabel}</p>
                </div>
                <Badge variant="outline" className={STATUS_STYLES[item.status]}>
                  {t(`status.${item.status}`)}
                </Badge>
              </div>
              {item.adminNote ? (
                <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  {item.adminNote}
                </p>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
