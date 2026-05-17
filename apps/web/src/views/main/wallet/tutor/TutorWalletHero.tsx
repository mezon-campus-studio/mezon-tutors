'use client';

import { ArrowDownToLine, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { formatToCurrency, ECurrency } from '@mezon-tutors/shared';
import type { WalletDetailsApiResponse, WalletStatsApiResponse } from '@mezon-tutors/shared';
import { Button, Skeleton } from '@/components/ui';
import {
  getTutorEarningsChartPercents,
  getTutorWalletMetrics,
} from './tutor-wallet-metrics';

type TutorWalletHeroProps = {
  details: WalletDetailsApiResponse | undefined;
  stats: WalletStatsApiResponse | undefined;
  isPending?: boolean;
  onWithdrawClick: () => void;
};

export default function TutorWalletHero({
  details,
  stats,
  isPending,
  onWithdrawClick,
}: TutorWalletHeroProps) {
  const t = useTranslations('Wallet.tutor.hero');
  const tCard = useTranslations('Wallet.balanceCard');

  if (isPending || !details) {
    return (
      <div className="relative overflow-hidden rounded-[1.75rem] border border-indigo-500/20 bg-slate-900 p-5 md:p-6">
        <Skeleton className="h-4 w-28 bg-white/15" />
        <Skeleton className="mt-4 h-14 w-64 bg-white/15" />
        <Skeleton className="mt-4 h-20 w-full rounded-2xl bg-white/10" />
        <Skeleton className="mt-4 h-10 w-40 rounded-full bg-white/10" />
      </div>
    );
  }

  const metrics = getTutorWalletMetrics(details, stats);
  const { receivedPct, withdrawnPct } = getTutorEarningsChartPercents(
    metrics.monthReceived,
    metrics.monthWithdrawn,
  );

  return (
    <section className="relative overflow-hidden rounded-[1.75rem] border border-indigo-400/25 bg-[linear-gradient(145deg,#0c0a1f_0%,#1e1b4b_42%,#4c1d95_78%,#7c3aed_100%)] p-5 text-white shadow-2xl shadow-indigo-950/30 md:p-6">
      <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-fuchsia-500/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 left-0 size-72 rounded-full bg-indigo-400/20 blur-3xl" />

      <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_200px] lg:gap-6">
        <div className="flex min-w-0 flex-col justify-between gap-4">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-100">
                <Sparkles className="size-3" />
                {tCard('currency')}
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/35 bg-emerald-400/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-100">
                <div className="size-1.5 rounded-full bg-emerald-300" />
                {t('statusActive')}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-indigo-200/90">{tCard('tutorAvailableLabel')}</p>
              <p className="mt-1 text-4xl font-extrabold tracking-tight tabular-nums md:text-5xl lg:text-[3.25rem]">
                {formatToCurrency(ECurrency.VND, metrics.available)}
              </p>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-indigo-100/85">
                <span>
                  {t('withdrawableLabel')}:{' '}
                  <span className="font-semibold text-white">
                    {formatToCurrency(ECurrency.VND, metrics.withdrawable)}
                  </span>
                </span>
                <span>
                  {tCard('tutorPendingLabel')}:{' '}
                  <span className="font-semibold text-amber-200">
                    {formatToCurrency(ECurrency.VND, metrics.pendingRelease)}
                  </span>
                </span>
              </div>
            </div>
          </div>

          <Button
            type="button"
            disabled={!metrics.canWithdraw}
            onClick={onWithdrawClick}
            className="h-11 w-fit rounded-full border-0 bg-white px-6 font-semibold text-indigo-950 shadow-lg shadow-indigo-950/40 hover:bg-indigo-50 disabled:opacity-60"
          >
            <ArrowDownToLine className="size-4" />
            {t('withdrawCta')}
          </Button>
        </div>

        <div className="flex flex-col justify-end">
          <div className="rounded-2xl border border-white/12 bg-white/8 p-3.5 backdrop-blur-md">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-200/80">
              {t('trendTitle')}
            </p>
            <div className="mt-3 flex h-20 items-end gap-2">
              <div className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full max-w-[48px] rounded-t-lg bg-emerald-400/90 transition-all"
                  style={{ height: `${Math.max(10, (receivedPct / 100) * 56)}px` }}
                />
                <div className="flex items-center gap-1 text-[10px] text-indigo-100/70">
                  <TrendingUp className="size-3 text-emerald-300" />
                  {t('chartEarned')}
                </div>
              </div>
              <div className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full max-w-[48px] rounded-t-lg bg-orange-400/90 transition-all"
                  style={{ height: `${Math.max(10, (withdrawnPct / 100) * 56)}px` }}
                />
                <div className="flex items-center gap-1 text-[10px] text-indigo-100/70">
                  <TrendingDown className="size-3 text-orange-300" />
                  {t('chartWithdrawn')}
                </div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/10 pt-3 text-xs">
              <div>
                <p className="text-indigo-200/70">{t('chartEarned')}</p>
                <p className="mt-0.5 font-semibold tabular-nums text-emerald-200">
                  {formatToCurrency(ECurrency.VND, metrics.monthReceived)}
                </p>
              </div>
              <div>
                <p className="text-indigo-200/70">{t('chartWithdrawn')}</p>
                <p className="mt-0.5 font-semibold tabular-nums text-orange-200">
                  {formatToCurrency(ECurrency.VND, metrics.monthWithdrawn)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
