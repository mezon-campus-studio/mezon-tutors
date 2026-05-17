'use client';

import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Clock4,
  History,
  TrendingUp,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { formatToCurrency, ECurrency } from '@mezon-tutors/shared';
import {
  isStudentWalletStats,
  isTutorWalletStats,
  type WalletDetailsApiResponse,
  type WalletStatsApiResponse,
} from '@mezon-tutors/shared';
import { Card, CardContent, Skeleton } from '@/components/ui';

type WalletMetricsProps = {
  details: WalletDetailsApiResponse | undefined;
  stats: WalletStatsApiResponse | undefined;
  isPending?: boolean;
};

export default function WalletMetrics({ details, stats, isPending }: WalletMetricsProps) {
  const t = useTranslations('Wallet.metrics');
  const isTutor = details?.role === 'TUTOR';

  const tutorStats = isTutorWalletStats(stats) ? stats : undefined;
  const studentStats = isStudentWalletStats(stats) ? stats : undefined;

  const items = isTutor
    ? [
        {
          key: 'month-received',
          icon: TrendingUp,
          iconClass: 'bg-emerald-100 text-emerald-700',
          title: t('monthReceived.title'),
          value: formatToCurrency(ECurrency.VND, tutorStats?.monthReceived ?? 0),
          helper: t('monthReceived.helper'),
        },
        {
          key: 'month-withdrawn',
          icon: ArrowUpRight,
          iconClass: 'bg-rose-100 text-rose-700',
          title: t('monthWithdrawn.title'),
          value: formatToCurrency(ECurrency.VND, tutorStats?.monthWithdrawn ?? 0),
          helper: t('monthWithdrawn.helper'),
        },
        {
          key: 'total-received',
          icon: Banknote,
          iconClass: 'bg-emerald-100 text-emerald-700',
          title: t('totalReceived.title'),
          value: formatToCurrency(ECurrency.VND, tutorStats?.totalReceived ?? 0),
          helper: t('totalReceived.helper'),
        },
        {
          key: 'total-withdrawn',
          icon: Clock4,
          iconClass: 'bg-amber-100 text-amber-700',
          title: t('totalWithdrawn.title'),
          value: formatToCurrency(ECurrency.VND, tutorStats?.totalWithdrawn ?? 0),
          helper: t('totalWithdrawn.helper'),
        },
      ]
    : [
        {
          key: 'month-spend',
          icon: ArrowDownLeft,
          iconClass: 'bg-violet-100 text-violet-700',
          title: t('monthActivity.title'),
          value: formatToCurrency(ECurrency.VND, studentStats?.monthSpent ?? 0),
          helper: t('monthActivity.studentHelper'),
        },
        {
          key: 'month-refunds',
          icon: ArrowUpRight,
          iconClass: 'bg-emerald-100 text-emerald-700',
          title: t('monthRefunds.title'),
          value: formatToCurrency(ECurrency.VND, studentStats?.monthRefunded ?? 0),
          helper: t('monthRefunds.helper'),
        },
        {
          key: 'refunded',
          icon: Banknote,
          iconClass: 'bg-fuchsia-100 text-fuchsia-700',
          title: t('totalRefunded.title'),
          value: formatToCurrency(ECurrency.VND, studentStats?.totalRefunded ?? 0),
          helper: t('totalRefunded.helper'),
        },
        {
          key: 'spent',
          icon: History,
          iconClass: 'bg-rose-100 text-rose-700',
          title: t('totalSpent.title'),
          value: formatToCurrency(ECurrency.VND, studentStats?.totalSpent ?? 0),
          helper: t('totalSpent.helper'),
        },
      ];

  if (isPending) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-violet-100">
            <CardContent className="p-5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-3 h-8 w-28" />
              <Skeleton className="mt-3 h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {items.map(({ key, icon: Icon, iconClass, title, value, helper }) => (
        <Card key={key} className="border-violet-100 shadow-sm shadow-violet-100/40">
          <CardContent className="relative px-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-600">{title}</p>
                <p className="mt-2 text-2xl font-extrabold text-slate-900 md:text-3xl">{value}</p>
              </div>
            </div>
            <div
                className={`absolute top-0 right-4 flex size-8 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
              >
                <Icon className="size-5" />
              </div>
            <p className="mt-3 text-xs text-slate-500">{helper}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
