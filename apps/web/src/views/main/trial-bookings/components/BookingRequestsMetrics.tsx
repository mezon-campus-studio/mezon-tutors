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
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {(['m1', 'm2', 'm3', 'm4'] as const).map((slot) => (
          <Card key={slot} className="border-violet-100">
            <CardContent className="p-5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-3 h-8 w-12" />
              <Skeleton className="mt-3 h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {ITEMS.map(({ key, icon: Icon, iconClass }) => (
        <Card key={key} className="border-violet-100 shadow-sm shadow-violet-100/40">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-600">
                  {t(`${key}.title`)}
                </p>
                <p className="mt-2 text-3xl font-extrabold text-slate-900">
                  {counts[key]}
                </p>
              </div>
              <div
                className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
              >
                <Icon className="size-5" />
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">{t(`${key}.helper`)}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
