"use client";

import type { AdminWalletTransactionApiItem } from "@mezon-tutors/shared";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui";

type TransactionsTableProps = {
  transactions: AdminWalletTransactionApiItem[];
  isLoading?: boolean;
};

const formatDate = (date: string) => {
  const d = dayjs(date);
  return d.isValid() ? d.format("DD/MM/YYYY HH:mm") : "—";
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);

export default function TransactionsTable({
  transactions,
  isLoading,
}: TransactionsTableProps) {
  const t = useTranslations("Admin.Transactions.list");
  const tTypes = useTranslations("Wallet.types");

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {(["r1", "r2", "r3", "r4", "r5"] as const).map((slot) => (
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
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">
        {t("empty")}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-5 py-3">{t("columns.user")}</th>
              <th className="px-5 py-3">{t("columns.type")}</th>
              <th className="px-5 py-3">{t("columns.direction")}</th>
              <th className="px-5 py-3">{t("columns.gross")}</th>
              <th className="px-5 py-3">{t("columns.reference")}</th>
              <th className="px-5 py-3">{t("columns.createdAt")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {transactions.map((item) => {
              const isCredit = item.direction === "CREDIT";
              const userName =
                item.user?.displayName || item.user?.username || t("unknownUser");
              const userRole = item.user?.role
                ? t(`roles.${item.user.role}`)
                : "—";
              const typeKey = item.type as Parameters<typeof tTypes>[0];

              const displayAmount = item.grossAmount ?? item.amount;

              return (
                <tr key={item.id} className="bg-white hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-900">
                        {userName}
                      </span>
                      <span className="text-xs text-slate-500">{userRole}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-slate-700">
                    {tTypes(typeKey)}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                        isCredit
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-rose-200 bg-rose-50 text-rose-800"
                      }`}
                    >
                      {isCredit ? t("direction.CREDIT") : t("direction.DEBIT")}
                    </span>
                  </td>
                  <td
                    className={`px-5 py-3 font-semibold tabular-nums ${
                      isCredit ? "text-emerald-700" : "text-rose-700"
                    }`}
                  >
                    {isCredit ? "+" : "−"}
                    {formatCurrency(displayAmount)}
                  </td>
                  <td className="max-w-[200px] truncate px-5 py-3 text-slate-600">
                    {item.referenceLabel || item.description || "—"}
                  </td>
                  <td className="px-5 py-3 text-slate-700">
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
