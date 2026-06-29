"use client";

import type { AdminWalletTransactionApiItem } from "@mezon-tutors/shared";
import { ArrowDownLeft, ArrowUpRight, Calendar, Receipt } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Card, CardContent, Skeleton } from "@/components/ui";
import { useAdminUserTransactions } from "@/services";
import TutorsPagination from "@/views/main/tutors/components/TutorsPagination";

type TransactionHistoryCardProps = {
  userId: string;
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);

const formatDate = (date: string) => {
  const d = new Date(date);
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function StatsCards({ userId }: { userId: string }) {
  const t = useTranslations(
    "AdminTutorApplicationDetail.sections.transactionHistory",
  );
  const { data, isLoading } = useAdminUserTransactions(userId, 1);

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(["s1", "s2", "s3", "s4"] as const).map((slot) => (
          <Card key={slot} className="border-slate-200">
            <CardContent className="p-4">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-2 h-7 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const { stats } = data;
  const items = [
    {
      key: "totalCredit",
      icon: ArrowDownLeft,
      value: formatCurrency(stats.totalCredit),
      iconClass: "bg-emerald-100 text-emerald-700",
    },
    {
      key: "totalDebit",
      icon: ArrowUpRight,
      value: formatCurrency(stats.totalDebit),
      iconClass: "bg-rose-100 text-rose-700",
    },
    {
      key: "monthIncome",
      icon: Calendar,
      value: formatCurrency(stats.monthIncome ?? 0),
      iconClass: "bg-blue-100 text-blue-700",
    },
    {
      key: "transactionCount",
      icon: Receipt,
      value: stats.transactionCount.toLocaleString("vi-VN"),
      iconClass: "bg-amber-100 text-amber-700",
    },
  ] as const;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map(({ key, icon: Icon, value, iconClass }) => (
        <Card key={key} className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500">
                  {t(`stats.${key}.title`)}
                </p>
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
      ))}
    </div>
  );
}

function TransactionsTable({
  transactions,
  isLoading,
}: {
  transactions: AdminWalletTransactionApiItem[];
  isLoading: boolean;
}) {
  const t = useTranslations(
    "AdminTutorApplicationDetail.sections.transactionHistory",
  );
  const tTypes = useTranslations("Wallet.types");

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        {(["r1", "r2", "r3", "r4"] as const).map((slot) => (
          <div
            key={slot}
            className="flex items-center gap-4 border-b border-slate-100 p-4 last:border-b-0"
          >
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
        {t("empty")}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">{t("columns.type")}</th>
              <th className="px-4 py-3">{t("columns.direction")}</th>
              <th className="px-4 py-3">{t("columns.amount")}</th>
              <th className="px-4 py-3">{t("columns.reference")}</th>
              <th className="px-4 py-3">{t("columns.createdAt")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {transactions.map((item) => {
              const isCredit = item.direction === "CREDIT";
              const typeKey = item.type as Parameters<typeof tTypes>[0];

              return (
                <tr key={item.id} className="bg-white hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-700">
                    {tTypes(typeKey)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                        isCredit
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-rose-200 bg-rose-50 text-rose-800"
                      }`}
                    >
                      {isCredit ? t("direction.CREDIT") : t("direction.DEBIT")}
                    </span>
                  </td>
                  <td
                    className={`px-4 py-3 font-semibold tabular-nums ${
                      isCredit ? "text-emerald-700" : "text-rose-700"
                    }`}
                  >
                    {isCredit ? "+" : "−"}
                    {formatCurrency(item.amount)}
                  </td>
                  <td className="max-w-[180px] truncate px-4 py-3 text-slate-600">
                    {item.referenceLabel || item.description || "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                    {formatDate(item.createdAt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function TransactionHistoryCard({
  userId,
}: TransactionHistoryCardProps) {
  const t = useTranslations(
    "AdminTutorApplicationDetail.sections.transactionHistory",
  );
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAdminUserTransactions(userId, page);

  const transactions = data?.items ?? [];
  const totalPages = data?.meta?.totalPages ?? 1;

  return (
    <Card className="border-slate-200">
      <CardContent className="p-5">
        <h3 className="mb-1 text-base font-semibold text-slate-900">
          {t("title")}
        </h3>
        <p className="mb-4 text-sm text-slate-500">{t("subtitle")}</p>

        <div className="mb-5">
          <StatsCards userId={userId} />
        </div>

        <div className="mb-4">
          <h4 className="text-sm font-semibold text-slate-800">
            {t("listTitle")}
          </h4>
        </div>

        <TransactionsTable
          transactions={transactions}
          isLoading={isLoading}
        />

        {totalPages > 1 ? (
          <div className="pt-4">
            <TutorsPagination
              page={page}
              totalPages={totalPages}
              onPageChangeAction={setPage}
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
