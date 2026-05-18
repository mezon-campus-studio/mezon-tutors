'use client';

import type { ReactNode } from 'react';
import {
  ArrowDownToLine,
  Banknote,
  Clock4,
  History,
  TrendingUp,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { formatToCurrency, ECurrency } from '@mezon-tutors/shared';
import type { WalletDetailsApiResponse, WalletStatsApiResponse } from '@mezon-tutors/shared';
import { Skeleton } from '@/components/ui';
import { getTutorWalletMetrics } from './tutor-wallet-metrics';

type TutorWalletBentoStatsProps = {
  details: WalletDetailsApiResponse | undefined;
  stats: WalletStatsApiResponse | undefined;
  isPending?: boolean;
};

type BentoTileProps = {
  label: string;
  value: string;
  helper: string;
  icon: ReactNode;
  className?: string;
  valueClassName?: string;
};

function BentoTile({ label, value, helper, icon, className, valueClassName }: BentoTileProps) {
  return (
    <article
      className={`group relative overflow-hidden rounded-2xl border border-indigo-100/90 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:shadow-indigo-100/50 ${className ?? ''}`}
    >
      <div className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-indigo-100/50 blur-2xl transition-opacity group-hover:opacity-90" />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p
            className={`mt-2 text-2xl font-extrabold tracking-tight tabular-nums md:text-3xl ${valueClassName ?? 'text-slate-900'}`}
          >
            {value}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">{helper}</p>
        </div>
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
          {icon}
        </div>
      </div>
    </article>
  );
}

export default function TutorWalletBentoStats({
  details,
  stats,
  isPending,
}: TutorWalletBentoStatsProps) {
  const t = useTranslations('Wallet.metrics');
  const tSection = useTranslations('Wallet.tutor.bento');
  const metrics = getTutorWalletMetrics(details, stats);

  if (isPending || !details) {
    return (
      <section>
        <Skeleton className="mb-4 h-6 w-48" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-6 md:grid-rows-2 md:gap-4">
          <Skeleton className="col-span-2 row-span-2 min-h-[180px] rounded-2xl md:col-span-3" />
          <Skeleton className="min-h-[84px] rounded-2xl md:col-span-3" />
          <Skeleton className="min-h-[84px] rounded-2xl" />
          <Skeleton className="min-h-[84px] rounded-2xl" />
          <Skeleton className="min-h-[84px] rounded-2xl md:col-span-2" />
          <Skeleton className="min-h-[84px] rounded-2xl md:col-span-2" />
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="tutor-wallet-bento-heading">
      <div className="mb-4">
        <h2 id="tutor-wallet-bento-heading" className="text-lg font-bold tracking-tight text-slate-900">
          {tSection('title')}
        </h2>
        <p className="mt-0.5 text-sm text-slate-500">{tSection('subtitle')}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-6 md:grid-rows-2 md:gap-4">
        <BentoTile
          className="col-span-2 row-span-2 md:col-span-3 md:p-6"
          label={t('monthReceived.title')}
          value={formatToCurrency(ECurrency.VND, metrics.monthReceived)}
          helper={t('monthReceived.helper')}
          icon={<TrendingUp className="size-5 text-emerald-600" />}
          valueClassName="text-emerald-700"
        />
        <BentoTile
          className="md:col-span-3"
          label={t('totalReceived.title')}
          value={formatToCurrency(ECurrency.VND, metrics.totalReceived)}
          helper={t('totalReceived.helper')}
          icon={<Banknote className="size-5 text-indigo-700" />}
          valueClassName="text-indigo-900"
        />
        <BentoTile
          className="md:col-span-3"
          label={tSection('pendingBalanceTitle')}
          value={formatToCurrency(ECurrency.VND, metrics.pendingRelease)}
          helper={tSection('pendingBalanceHelper')}
          icon={<Clock4 className="size-5 text-amber-600" />}
          valueClassName="text-amber-700"
        />
        <BentoTile
          className="md:col-span-2"
          label={t('pendingWithdrawals.title')}
          value={formatToCurrency(ECurrency.VND, metrics.pendingWithdrawal)}
          helper={t('pendingWithdrawals.helper')}
          icon={<Clock4 className="size-5 text-violet-600" />}
          valueClassName="text-violet-800"
        />
        <BentoTile
          className="md:col-span-2"
          label={t('monthWithdrawn.title')}
          value={formatToCurrency(ECurrency.VND, metrics.monthWithdrawn)}
          helper={t('monthWithdrawn.helper')}
          icon={<ArrowDownToLine className="size-5 text-amber-600" />}
          valueClassName="text-amber-700"
        />
        <BentoTile
          className="md:col-span-2"
          label={t('totalWithdrawn.title')}
          value={formatToCurrency(ECurrency.VND, metrics.totalWithdrawn)}
          helper={t('totalWithdrawn.helper')}
          icon={<History className="size-5 text-rose-600" />}
          valueClassName="text-rose-700"
        />
      </div>
    </section>
  );
}
