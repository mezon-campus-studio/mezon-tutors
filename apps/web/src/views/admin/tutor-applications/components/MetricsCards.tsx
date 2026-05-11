"use client";

import type { TutorApplicationMetrics } from "@mezon-tutors/shared";
import { Clock4, ListChecks, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent, Skeleton } from "@/components/ui";

type MetricsCardsProps = {
  metrics?: TutorApplicationMetrics;
  isLoading?: boolean;
};

const formatPercent = (value: number | undefined): string => {
  if (value === undefined || value === null || Number.isNaN(value)) return "0%";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value}%`;
};

export default function MetricsCards({
  metrics,
  isLoading,
}: MetricsCardsProps) {
  const t = useTranslations("Admin.TutorApplications.metrics");

  if (isLoading || !metrics) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {(["s1", "s2", "s3"] as const).map((slot) => (
          <Card key={slot} className="border-slate-200">
            <CardContent className="p-5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-3 h-8 w-16" />
              <Skeleton className="mt-3 h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const items = [
    {
      key: "totalPending",
      icon: ListChecks,
      value: metrics.total_pending.toString(),
      change: metrics.total_pending_change_percent,
      iconClass: "bg-amber-100 text-amber-700",
    },
    {
      key: "approvedToday",
      icon: ShieldCheck,
      value: metrics.approved_today.toString(),
      change: metrics.approved_today_change_percent,
      iconClass: "bg-emerald-100 text-emerald-700",
    },
    {
      key: "avgReviewTime",
      icon: Clock4,
      value: `${metrics.avg_review_time_hours}h`,
      change: metrics.avg_review_time_change_percent,
      iconClass: "bg-violet-100 text-violet-700",
    },
  ] as const;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {items.map(({ key, icon: Icon, value, change, iconClass }) => (
        <Card key={key} className="border-slate-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  {t(`${key}.title`)}
                </p>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {value}
                </p>
              </div>
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconClass}`}
              >
                <Icon className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              {formatPercent(change)} · {t(`${key}.helper`)}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
