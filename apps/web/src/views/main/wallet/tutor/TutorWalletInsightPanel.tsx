'use client';

import { Clock4, ShieldCheck, Sparkles, Wallet } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { formatToCurrency, ECurrency } from '@mezon-tutors/shared';
import type { WalletDetailsApiResponse, WalletStatsApiResponse } from '@mezon-tutors/shared';
import type { WalletWithdrawalApiItem } from '@mezon-tutors/shared';
import { Skeleton } from '@/components/ui';
import { getTutorWalletMetrics } from './tutor-wallet-metrics';

const PENDING_WITHDRAWAL_STATUSES = new Set(['PENDING', 'APPROVED', 'PROCESSING']);

type TutorWalletInsightPanelProps = {
  details: WalletDetailsApiResponse | undefined;
  stats: WalletStatsApiResponse | undefined;
  withdrawals: WalletWithdrawalApiItem[];
  isPending?: boolean;
};

export default function TutorWalletInsightPanel({
  details,
  stats,
  withdrawals,
  isPending,
}: TutorWalletInsightPanelProps) {
  const t = useTranslations('Wallet.tutor.insight');
  const tCard = useTranslations('Wallet.balanceCard');

  if (isPending || !details) {
    return (
      <aside className="flex flex-col gap-3">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
      </aside>
    );
  }

  const metrics = getTutorWalletMetrics(details, stats);
  const pendingPayouts = withdrawals.filter((w) => PENDING_WITHDRAWAL_STATUSES.has(w.status));
  const pendingPayoutAmount = pendingPayouts.reduce((sum, w) => sum + w.amount, 0);
  const accountHealthy = metrics.available > 0 || metrics.pendingRelease > 0;

  return (
    <aside className="flex flex-col gap-3">
      <div className="rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50/90 to-white p-4 shadow-sm">
        <div className="flex items-start gap-2.5">
          <Clock4 className="mt-0.5 size-4 shrink-0 text-amber-700" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-800">
              {t('pendingPayoutsTitle')}
            </p>
            <p className="mt-1 text-xl font-extrabold tabular-nums text-amber-950">
              {formatToCurrency(ECurrency.VND, metrics.pendingRelease)}
            </p>
            <p className="mt-1 text-xs text-amber-800/90">{t('pendingPayoutsHint')}</p>
          </div>
        </div>
      </div>

      {pendingPayouts.length > 0 ? (
        <div className="rounded-2xl border border-violet-100/80 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-600">{t('withdrawalQueueTitle')}</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-slate-900">
            {pendingPayouts.length} · {formatToCurrency(ECurrency.VND, pendingPayoutAmount)}
          </p>
          <p className="mt-1 text-xs text-slate-500">{t('withdrawalQueueHint')}</p>
        </div>
      ) : null}

      <div className="rounded-2xl border border-violet-100/80 bg-white p-4 shadow-sm">
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-violet-600" aria-hidden />
          <div>
            <p className="text-xs font-semibold text-slate-900">{tCard('secured')}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">{t('securityHint')}</p>
          </div>
        </div>
      </div>

      <div
        className={`rounded-2xl border p-4 shadow-sm ${
          accountHealthy
            ? 'border-emerald-200/70 bg-emerald-50/50'
            : 'border-slate-200/80 bg-slate-50/80'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-medium text-slate-600">{t('accountHealthTitle')}</p>
            <p
              className={`mt-1 text-sm font-semibold ${
                accountHealthy ? 'text-emerald-800' : 'text-slate-700'
              }`}
            >
              {accountHealthy ? t('accountHealthGood') : t('accountHealthIdle')}
            </p>
          </div>
          <div
            className={`flex size-9 items-center justify-center rounded-lg ${
              accountHealthy ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
            }`}
          >
            {accountHealthy ? <Sparkles className="size-4" /> : <Wallet className="size-4" />}
          </div>
        </div>
      </div>
    </aside>
  );
}
