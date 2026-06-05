'use client';

import { ArrowDownToLine, Clock4 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { formatToCurrency, ECurrency } from '@mezon-tutors/shared';
import type { WalletDetailsApiResponse, WalletStatsApiResponse } from '@mezon-tutors/shared';
import { Skeleton } from '@/components/ui';
import WalletPayoutBankCard from '../components/WalletPayoutBankCard';
import { getTutorWalletMetrics } from './tutor-wallet-metrics';

type TutorWalletInsightPanelProps = {
  details: WalletDetailsApiResponse | undefined;
  stats: WalletStatsApiResponse | undefined;
  isPending?: boolean;
  onManageBankClick: () => void;
};

export default function TutorWalletInsightPanel({
  details,
  stats,
  isPending,
  onManageBankClick,
}: TutorWalletInsightPanelProps) {
  const t = useTranslations('Wallet.tutor.insight');

  if (isPending || !details) {
    return (
      <aside className="flex flex-col gap-3">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </aside>
    );
  }

  const metrics = getTutorWalletMetrics(details, stats);
  const bank = details.payoutBankAccount ?? null;

  return (
    <aside className="flex flex-col justify-center gap-3 sm:grid sm:grid-cols-2 sm:gap-3 lg:flex lg:flex-col">
      <div className="rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50/90 to-white p-4 shadow-sm sm:col-span-2 lg:col-span-1">
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
      <div className="sm:col-span-2 lg:col-span-1">
        <WalletPayoutBankCard bank={bank} onManageBankClick={onManageBankClick} />
      </div>
    </aside>
  );
}
