'use client';

import type { ReactNode } from 'react';
import { ArrowDownLeft, ArrowUpRight, Banknote, History } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { formatToCurrency, ECurrency } from '@mezon-tutors/shared';
import {
  isStudentWalletStats,
  type WalletDetailsApiResponse,
  type WalletStatsApiResponse,
} from '@mezon-tutors/shared';
import { Skeleton } from '@/components/ui';

type StudentWalletBentoStatsProps = {
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
      className={`group relative overflow-hidden rounded-2xl border border-violet-100/90 bg-white p-5 shadow-sm transition-shadow hover:shadow-md hover:shadow-violet-100/60 ${className ?? ''}`}
    >
      <div className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-violet-100/40 blur-2xl transition-opacity group-hover:opacity-80" />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className={`mt-2 text-2xl font-extrabold tracking-tight tabular-nums md:text-3xl ${valueClassName ?? 'text-slate-900'}`}>
            {value}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">{helper}</p>
        </div>
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
          {icon}
        </div>
      </div>
    </article>
  );
}

export default function StudentWalletBentoStats({
  details,
  stats,
  isPending,
}: StudentWalletBentoStatsProps) {
  const t = useTranslations('Wallet.metrics');
  const tSection = useTranslations('Wallet.student.bento');

  const studentStats = isStudentWalletStats(stats) ? stats : undefined;

  if (isPending || !details) {
    return (
      <section>
        <Skeleton className="mb-4 h-6 w-40" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:grid-rows-2 md:gap-4">
          <Skeleton className="col-span-2 row-span-2 min-h-[180px] rounded-2xl" />
          <Skeleton className="min-h-[84px] rounded-2xl md:col-span-2" />
          <Skeleton className="min-h-[84px] rounded-2xl" />
          <Skeleton className="min-h-[84px] rounded-2xl md:col-span-2" />
          <Skeleton className="min-h-[84px] rounded-2xl md:col-span-2" />
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="wallet-bento-heading">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 id="wallet-bento-heading" className="text-lg font-bold tracking-tight text-slate-900">
            {tSection('title')}
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">{tSection('subtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:grid-rows-2 md:gap-4">
        <BentoTile
          className="col-span-2 row-span-2 md:p-6"
          label={t('monthActivity.title')}
          value={formatToCurrency(ECurrency.VND, studentStats?.monthSpent ?? 0)}
          helper={t('monthActivity.studentHelper')}
          icon={<ArrowDownLeft className="size-5" />}
          valueClassName="text-slate-900"
        />
        <BentoTile
          className="md:col-span-2"
          label={t('monthRefunds.title')}
          value={formatToCurrency(ECurrency.VND, studentStats?.monthRefunded ?? 0)}
          helper={t('monthRefunds.helper')}
          icon={<ArrowUpRight className="size-5 text-emerald-700" />}
          valueClassName="text-emerald-700"
        />
        <BentoTile
          label={t('totalRefunded.title')}
          value={formatToCurrency(ECurrency.VND, studentStats?.totalRefunded ?? 0)}
          helper={t('totalRefunded.helper')}
          icon={<Banknote className="size-5 text-fuchsia-700" />}
          valueClassName="text-fuchsia-800"
        />
        <BentoTile
          label={t('totalSpent.title')}
          value={formatToCurrency(ECurrency.VND, studentStats?.totalSpent ?? 0)}
          helper={t('totalSpent.helper')}
          icon={<History className="size-5 text-rose-700" />}
          valueClassName="text-rose-700"
        />
      </div>
    </section>
  );
}

