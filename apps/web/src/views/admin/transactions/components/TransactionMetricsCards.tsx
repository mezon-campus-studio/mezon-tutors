"use client";

import type { AdminWalletTransactionStatsApiResponse } from "@mezon-tutors/shared";
import { ArrowDownLeft, ArrowUpRight, Coins, Receipt } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent, Skeleton } from "@/components/ui";

type TransactionMetricsCardsProps = {
  stats?: AdminWalletTransactionStatsApiResponse;
  isLoading?: boolean;
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);

export default function TransactionMetricsCards({
  stats,
  isLoading,
}: TransactionMetricsCardsProps) {
  const t = useTranslations("Admin.Transactions.metrics");

  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(["s1", "s2", "s3", "s4"] as const).map((slot) => (
          <Card key={slot} className="border-slate-200">
            <CardContent className="p-5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-3 h-8 w-32" />
              <Skeleton className="mt-3 h-3 w-40" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const items = [
    {
      key: "totalCredit",
      icon: ArrowDownLeft,
      value: formatCurrency(stats.totalCredit),
      helper: t("totalCredit.helper", {
        amount: formatCurrency(stats.monthCredit),
      }),
      iconClass: "bg-emerald-100 text-emerald-700",
    },
    {
      key: "totalDebit",
      icon: ArrowUpRight,
      value: formatCurrency(stats.totalDebit),
      helper: t("totalDebit.helper", {
        amount: formatCurrency(stats.monthDebit),
      }),
      iconClass: "bg-rose-100 text-rose-700",
    },
    {
      key: "platformFee",
      icon: Coins,
      value: formatCurrency(stats.totalPlatformFee),
      helper: t("platformFee.helper"),
      iconClass: "bg-violet-100 text-violet-700",
    },
    {
      key: "transactionCount",
      icon: Receipt,
      value: stats.transactionCount.toLocaleString("vi-VN"),
      helper: t("transactionCount.helper", {
        count: stats.monthTransactionCount.toLocaleString("vi-VN"),
      }),
      iconClass: "bg-amber-100 text-amber-700",
    },
  ] as const;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map(({ key, icon: Icon, value, helper, iconClass }) => (
        <Card key={key} className="border-slate-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-600">
                  {t(`${key}.title`)}
                </p>
                <p className="mt-2 truncate text-2xl font-bold text-slate-900">
                  {value}
                </p>
              </div>
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconClass}`}
              >
                <Icon className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">{helper}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
