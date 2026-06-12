'use client';

import { Bell } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { formatToCurrency, ECurrency } from '@mezon-tutors/shared';
import {
  isStudentWalletStats,
  type WalletDetailsApiResponse,
  type WalletStatsApiResponse,
} from '@mezon-tutors/shared';
import { Skeleton } from '@/components/ui';
import WalletPayoutBankCard from '../components/WalletPayoutBankCard';

type StudentWalletInsightPanelProps = {
  details: WalletDetailsApiResponse | undefined;
  stats: WalletStatsApiResponse | undefined;
  isPending?: boolean;
  onManageBankClick: () => void;
};

export default function StudentWalletInsightPanel({
  details,
  stats,
  isPending,
  onManageBankClick,
}: StudentWalletInsightPanelProps) {
  const t = useTranslations('Wallet.student.insight');
  const tCard = useTranslations('Wallet.balanceCard');
  const tMetrics = useTranslations('Wallet.metrics');

  if (isPending || !details) {
    return (
      <aside className="flex flex-col gap-3">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </aside>
    );
  }

  const studentStats = isStudentWalletStats(stats) ? stats : undefined;
  const pendingBalance = details.pendingBalance ?? 0;
  const pendingWithdrawal = details.pendingWithdrawal ?? 0;
  const hasPendingPayment = pendingBalance > 0;
  const hasPendingWithdrawal = pendingWithdrawal > 0;

  return (
    <aside className="flex flex-col gap-3 sm:grid sm:grid-cols-2 sm:gap-3 lg:flex lg:flex-col">
      <div className="rounded-2xl border border-violet-100/80 bg-gradient-to-br from-violet-50/80 to-white p-4 shadow-sm sm:col-span-2 lg:col-span-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-violet-600">
          {t('monthlyTitle')}
        </p>
        <dl className="mt-3 space-y-3">
          <div>
            <dt className="text-xs text-slate-500">{tMetrics('monthActivity.title')}</dt>
            <dd className="mt-0.5 text-lg font-bold tabular-nums text-slate-900">
              {formatToCurrency(ECurrency.VND, studentStats?.monthSpent ?? 0)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">{tMetrics('monthRefunds.title')}</dt>
            <dd className="mt-0.5 text-lg font-bold tabular-nums text-emerald-700">
              {formatToCurrency(ECurrency.VND, studentStats?.monthRefunded ?? 0)}
            </dd>
          </div>
        </dl>
      </div>

      {hasPendingPayment ? (
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/90 p-4 sm:col-span-2 lg:col-span-1">
          <div className="flex gap-2.5">
            <Bell className="mt-0.5 size-4 shrink-0 text-amber-700" />
            <div>
              <p className="text-xs font-semibold text-amber-900">{t('pendingTitle')}</p>
              <p className="mt-1 text-xs text-amber-800/90">
                {formatToCurrency(ECurrency.VND, pendingBalance)} ·{' '}
                {tCard('studentPendingLabel')}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {hasPendingWithdrawal ? (
        <div className="rounded-2xl border border-violet-200/80 bg-violet-50/90 p-4 sm:col-span-2 lg:col-span-1">
          <div className="flex gap-2.5">
            <Bell className="mt-0.5 size-4 shrink-0 text-violet-700" />
            <div>
              <p className="text-xs font-semibold text-violet-900">{t('pendingWithdrawalTitle')}</p>
              <p className="mt-1 text-xs text-violet-800/90">
                {formatToCurrency(ECurrency.VND, pendingWithdrawal)} ·{' '}
                {t('pendingWithdrawalHint')}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="sm:col-span-2 lg:col-span-1">
        <WalletPayoutBankCard
          bank={details.payoutBankAccount ?? null}
          onManageBankClick={onManageBankClick}
        />
      </div>
    </aside>
  );
}
