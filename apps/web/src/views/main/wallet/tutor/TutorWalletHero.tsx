'use client';

import { AlertTriangle, ArrowDownToLine, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';
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
  const tInsight = useTranslations('Wallet.tutor.insight');
  const tCard = useTranslations('Wallet.balanceCard');

  if (isPending || !details) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-indigo-500/20 bg-slate-900 p-4 sm:rounded-[1.75rem] sm:p-5 md:p-6">
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
    <section className="relative overflow-hidden rounded-2xl border border-indigo-400/25 bg-[linear-gradient(145deg,#0c0a1f_0%,#1e1b4b_42%,#4c1d95_78%,#7c3aed_100%)] p-4 text-white shadow-2xl shadow-indigo-950/30 sm:rounded-[1.75rem] sm:p-5 md:p-6">
      <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-fuchsia-500/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 left-0 size-72 rounded-full bg-indigo-400/20 blur-3xl" />

      <div className="relative grid gap-5 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_200px]">
        <div className="flex min-w-0 flex-col justify-between gap-4 sm:gap-5">
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
              <p className="mt-1 text-3xl font-extrabold tracking-tight break-words tabular-nums sm:text-4xl md:text-5xl lg:text-[3.25rem]">
                {formatToCurrency(ECurrency.VND, metrics.available)}
              </p>
              <div className="mt-3 flex flex-col gap-1 text-sm text-indigo-100/85 sm:flex-row sm:flex-wrap sm:gap-x-5 sm:gap-y-1">
                <span>
                  {t('withdrawableLabel')}:{' '}
                  <span className="font-semibold text-white">
                    {formatToCurrency(ECurrency.VND, metrics.withdrawable)}
                  </span>
                </span>
                <span>
                  {tInsight('pendingWithdrawalTitle')}:{' '}
                  <span className="font-semibold text-amber-300">
                    {formatToCurrency(ECurrency.VND, metrics.pendingWithdrawal)}
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            <Button
              type="button"
              disabled={!metrics.canWithdraw}
              onClick={onWithdrawClick}
              className="h-11 min-h-11 w-full rounded-full border-0 bg-amber-300 px-6 font-semibold text-amber-950 shadow-lg shadow-amber-900/30 hover:bg-amber-200 disabled:opacity-60 sm:w-fit"
            >
              <ArrowDownToLine className="size-4" />
              {t('withdrawCta')}
            </Button>
            {details.withdrawalWindowOpen === false ? (
              <div className="flex items-start gap-2 rounded-xl border border-amber-300/35 bg-amber-400/10 px-3 py-2.5 text-amber-50/95">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-300" aria-hidden />
                <p className="text-xs leading-relaxed">{t('withdrawWindowWarning')}</p>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col justify-end sm:max-w-sm lg:max-w-none">
          <div className="rounded-2xl border border-white/12 bg-white/8 p-4 backdrop-blur-md sm:p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-200/80">
              {t('trendTitle')}
            </p>
            <div className="mt-3">
              <div className="flex h-16 items-end gap-3">
                <div className="flex h-full flex-1 items-end justify-center">
                  <div
                    className="w-full max-w-[48px] rounded-t-lg bg-emerald-400/90 transition-all"
                    style={{ height: `${Math.max(10, (receivedPct / 100) * 52)}px` }}
                  />
                </div>
                <div className="flex h-full flex-1 items-end justify-center">
                  <div
                    className="w-full max-w-[48px] rounded-t-lg bg-amber-400/90 transition-all"
                    style={{ height: `${Math.max(10, (withdrawnPct / 100) * 52)}px` }}
                  />
                </div>
              </div>
              <div className="mt-2 flex gap-3">
                <div className="flex flex-1 items-center justify-center gap-1 text-[10px] text-indigo-100/70">
                  <TrendingUp className="size-3 shrink-0 text-emerald-300" />
                  {t('chartEarned')}
                </div>
                <div className="flex flex-1 items-center justify-center gap-1 text-[10px] text-indigo-100/70">
                  <TrendingDown className="size-3 shrink-0 text-amber-300" />
                  {t('chartWithdrawn')}
                </div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/10 pt-3 text-center text-xs">
              <div>
                <p className="text-indigo-200/70">{t('chartEarned')}</p>
                <p className="mt-0.5 font-semibold tabular-nums text-emerald-200">
                  {formatToCurrency(ECurrency.VND, metrics.monthReceived)}
                </p>
              </div>
              <div>
                <p className="text-indigo-200/70">{t('chartWithdrawn')}</p>
                <p className="mt-0.5 font-semibold tabular-nums text-amber-200">
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
