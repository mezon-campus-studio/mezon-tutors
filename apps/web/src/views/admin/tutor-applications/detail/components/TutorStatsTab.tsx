"use client";

import {
  Banknote,
  BookOpen,
  CalendarX,
  Clock,
  Coins,
  GraduationCap,
  PiggyBank,
  Presentation,
  Wallet,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent, Skeleton } from "@/components/ui";
import { useAdminTutorStats } from "@/services";
import TransactionHistoryCard from "./TransactionHistoryCard";

type TutorStatsTabProps = {
  tutorProfileId: string;
  userId: string;
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);

function StatCard({
  label,
  value,
  icon: Icon,
  iconClass,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  iconClass: string;
}) {
  return (
    <Card className="border-slate-200">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500">{label}</p>
            <p className="mt-1 truncate text-lg font-bold text-slate-900">
              {value}
            </p>
          </div>
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconClass}`}
          >
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {(["s1", "s2", "s3", "s4"] as const).map((s) => (
        <Card key={s} className="border-slate-200">
          <CardContent className="p-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-2 h-7 w-28" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function TutorStatsTab({
  tutorProfileId,
  userId,
}: TutorStatsTabProps) {
  const t = useTranslations(
    "AdminTutorApplicationDetail.sections.tutorStats",
  );
  const { data, isLoading } = useAdminTutorStats(tutorProfileId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <StatsGridSkeleton />
        <StatsGridSkeleton />
        <StatsGridSkeleton />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
        {t("error")}
      </div>
    );
  }

  const { wallet, lessons } = data;

  return (
    <div className="space-y-6">
      <Card className="border-slate-200">
        <CardContent className="p-5">
          <h3 className="mb-4 text-base font-semibold text-slate-900">
            {t("lessons.title")}
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label={t("lessons.completed")}
              value={lessons.completed.toLocaleString("vi-VN")}
              icon={Presentation}
              iconClass="bg-emerald-100 text-emerald-700"
            />
            <StatCard
              label={t("lessons.upcoming")}
              value={lessons.upcoming.toLocaleString("vi-VN")}
              icon={BookOpen}
              iconClass="bg-blue-100 text-blue-700"
            />
            <StatCard
              label={t("lessons.cancelled")}
              value={lessons.cancelled.toLocaleString("vi-VN")}
              icon={CalendarX}
              iconClass="bg-rose-100 text-rose-700"
            />
            <StatCard
              label={t("lessons.totalTrial")}
              value={lessons.trial.toLocaleString("vi-VN")}
              icon={GraduationCap}
              iconClass="bg-cyan-100 text-cyan-700"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardContent className="p-5">
          <h3 className="mb-4 text-base font-semibold text-slate-900">
            {t("wallet.title")}
          </h3>
          {wallet ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              <StatCard
                label={t("wallet.balance")}
                value={formatCurrency(wallet.balance)}
                icon={Wallet}
                iconClass="bg-emerald-100 text-emerald-700"
              />
              <StatCard
                label={t("wallet.pendingBalance")}
                value={formatCurrency(wallet.pendingBalance)}
                icon={Clock}
                iconClass="bg-amber-100 text-amber-700"
              />
              <StatCard
                label={t("wallet.pendingWithdrawal")}
                value={formatCurrency(wallet.pendingWithdrawal)}
                icon={Banknote}
                iconClass="bg-orange-100 text-orange-700"
              />
              <StatCard
                label={t("wallet.totalEarned")}
                value={formatCurrency(wallet.totalEarned)}
                icon={PiggyBank}
                iconClass="bg-blue-100 text-blue-700"
              />
              <StatCard
                label={t("wallet.totalWithdrawn")}
                value={formatCurrency(wallet.totalWithdrawn)}
                icon={Coins}
                iconClass="bg-violet-100 text-violet-700"
              />
            </div>
          ) : (
            <p className="text-sm text-slate-500">{t("wallet.noWallet")}</p>
          )}
        </CardContent>
      </Card>

      <TransactionHistoryCard userId={userId} />
    </div>
  );
}
