'use client';

import Link from 'next/link';
import { ArrowUpRight, BookOpen, Sparkles, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { formatToCurrency, ECurrency, ROUTES } from '@mezon-tutors/shared';
import {
  isStudentWalletStats,
  type WalletDetailsApiResponse,
  type WalletStatsApiResponse,
} from '@mezon-tutors/shared';
import { Button, Skeleton } from '@/components/ui';

type StudentWalletHeroProps = {
  details: WalletDetailsApiResponse | undefined;
  stats: WalletStatsApiResponse | undefined;
  isPending?: boolean;
};

export default function StudentWalletHero({ details, stats, isPending }: StudentWalletHeroProps) {
  const t = useTranslations('Wallet.student.hero');
  const tCard = useTranslations('Wallet.balanceCard');

  const isInactive = details?.role === 'STUDENT' && details.hasWallet === false;
  const balance = details?.walletBalance ?? details?.availableBalance ?? 0;
  const studentStats = isStudentWalletStats(stats) ? stats : undefined;
  const totalSpend = studentStats?.totalSpent ?? 0;
  const totalRefunds = studentStats?.totalRefunded ?? 0;
  const activityTotal = Math.max(totalSpend + totalRefunds, 1);
  const spendPct = Math.round((totalSpend / activityTotal) * 100);
  const refundPct = 100 - spendPct;

  if (isPending || !details) {
    return (
      <div className="relative min-h-[280px] overflow-hidden rounded-[1.75rem] border border-violet-200/50 bg-slate-900 p-6 md:min-h-[300px] md:p-8">
        <Skeleton className="h-4 w-24 bg-white/15" />
        <Skeleton className="mt-6 h-12 w-56 bg-white/15" />
        <Skeleton className="mt-8 h-20 w-full rounded-2xl bg-white/10" />
        <div className="mt-6 flex gap-3">
          <Skeleton className="h-10 flex-1 rounded-full bg-white/10" />
          <Skeleton className="h-10 flex-1 rounded-full bg-white/10" />
        </div>
      </div>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-[1.75rem] border border-violet-500/20 bg-[linear-gradient(145deg,#0f0720_0%,#2e1065_38%,#5b21b6_68%,#7c3aed_100%)] p-6 text-white shadow-2xl shadow-violet-900/25 md:p-8">
      <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-fuchsia-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/4 size-80 rounded-full bg-violet-400/15 blur-3xl" />

      <div className="relative flex flex-col gap-20 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 flex flex-col flex-1 gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-violet-100">
              <Sparkles className="size-3" />
              {tCard('currency')}
            </div>
            <div
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                isInactive
                  ? 'border border-amber-300/30 bg-amber-400/15 text-amber-100'
                  : 'border border-emerald-300/30 bg-emerald-400/15 text-emerald-100'
              }`}
            >
              <div
                className={`size-1.5 rounded-full ${isInactive ? 'bg-amber-300' : 'bg-emerald-300'}`}
              />
              {isInactive ? tCard('studentWalletInactiveTitle') : t('statusActive')}
            </div>
          </div>

          {isInactive ? (
            <div className="mt-5 max-w-lg">
              <div className="flex items-start gap-3 rounded-2xl border border-white/15 bg-white/8 p-4 backdrop-blur-md">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/12">
                  <Wallet className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{tCard('studentWalletInactiveTitle')}</p>
                  <p className="mt-1 text-sm leading-relaxed text-violet-100/85">
                    {tCard('studentWalletInactiveHint')}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <p className="mt-5 text-sm font-medium text-violet-200/90">{tCard('studentLabel')}</p>
              <p className="mt-1 text-4xl font-extrabold tracking-tight tabular-nums md:text-5xl">
                {formatToCurrency(ECurrency.VND, balance)}
              </p>
            </>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            <Link href={ROUTES.TUTOR.INDEX}>
              <Button className="h-10 rounded-full border-0 bg-white px-5 font-semibold text-violet-900 shadow-lg shadow-violet-950/30 hover:bg-violet-50">
                {t('actionTutors')}
                <ArrowUpRight className="size-4" />
              </Button>
            </Link>
            <Link href={ROUTES.DASHBOARD.MY_LESSONS}>
              <Button
                variant="outline"
                className="h-10 rounded-full border-white/25 bg-white/10 px-5 font-semibold text-white backdrop-blur-sm hover:bg-white/15"
              >
                <BookOpen className="size-4" />
                {t('actionLessons')}
              </Button>
            </Link>
          </div>
        </div>

        <div className="w-full shrink-0 lg:w-[220px]">
          <div className="rounded-2xl border border-white/12 bg-white/8 p-4 backdrop-blur-md">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-violet-200/80">
              {t('activityTitle')}
            </p>
            <div className="mt-4 flex h-24 items-end gap-2">
              <div className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full max-w-[52px] rounded-t-lg bg-rose-400/90 transition-all"
                  style={{ height: `${Math.max(12, (spendPct / 100) * 72)}px` }}
                />
                <div className="flex items-center gap-1 text-[10px] text-violet-100/70">
                  <TrendingDown className="size-3 text-rose-300" />
                  {t('chartSpend')}
                </div>
              </div>
              <div className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full max-w-[52px] rounded-t-lg bg-emerald-400/90 transition-all"
                  style={{ height: `${Math.max(12, (refundPct / 100) * 72)}px` }}
                />
                <div className="flex items-center gap-1 text-[10px] text-violet-100/70">
                  <TrendingUp className="size-3 text-emerald-300" />
                  {t('chartRefund')}
                </div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/10 pt-3 text-xs">
              <div>
                <p className="text-violet-200/70">{t('chartSpend')}</p>
                <p className="mt-0.5 font-semibold tabular-nums">
                  {formatToCurrency(ECurrency.VND, totalSpend)}
                </p>
              </div>
              <div>
                <p className="text-violet-200/70">{t('chartRefund')}</p>
                <p className="mt-0.5 font-semibold tabular-nums text-emerald-200">
                  {formatToCurrency(ECurrency.VND, totalRefunds)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
