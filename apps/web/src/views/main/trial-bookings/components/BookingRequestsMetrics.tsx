'use client';

import { CheckCircle2, ClipboardList, Clock4, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, Skeleton } from '@/components/ui';

type CountsShape = {
  total: number;
  pending: number;
  confirmed: number;
  completed: number;
  cancelled: number;
};

type BookingRequestsMetricsProps = {
  counts: CountsShape;
  isLoading?: boolean;
};

const ITEMS = [
  {
    key: 'total',
    icon: ClipboardList,
    iconClass: 'bg-violet-100 text-violet-700',
  },
  {
    key: 'pending',
    icon: Clock4,
    iconClass: 'bg-amber-100 text-amber-700',
  },
  {
    key: 'confirmed',
    icon: Sparkles,
    iconClass: 'bg-fuchsia-100 text-fuchsia-700',
  },
  {
    key: 'completed',
    icon: CheckCircle2,
    iconClass: 'bg-emerald-100 text-emerald-700',
  },
] as const;

export default function BookingRequestsMetrics({
  counts,
  isLoading,
}: BookingRequestsMetricsProps) {
  const t = useTranslations('Dashboard.bookingRequests.metrics');

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {(['m1', 'm2', 'm3', 'm4'] as const).map((slot) => (
          <Card key={slot} className="min-w-0 border-violet-100">
            <CardContent className="p-4 sm:p-5">
              <Skeleton className="h-4 w-20 sm:w-24" />
              <Skeleton className="mt-3 h-7 w-10 sm:h-8 sm:w-12" />
              <Skeleton className="mt-3 hidden h-3 w-32 sm:block" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {ITEMS.map(({ key, icon: Icon, iconClass }) => (
        <Card key={key} className="min-w-0 border-violet-100 shadow-sm shadow-violet-100/40">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-2 sm:gap-3">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-slate-600 sm:text-sm">
                  {t(`${key}.title`)}
                </p>
                <p className="mt-1.5 text-2xl font-extrabold text-slate-900 sm:mt-2 sm:text-3xl">
                  {counts[key]}
                </p>
              </div>
              <div
                className={`flex size-9 shrink-0 items-center justify-center rounded-xl sm:size-10 ${iconClass}`}
              >
                <Icon className="size-4 sm:size-5" />
              </div>
            </div>
            <p className="mt-2 hidden text-xs text-slate-500 sm:mt-3 sm:block">
              {t(`${key}.helper`)}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
