"use client";

import type {
  WalletTransactionDirection,
  WalletTransactionType,
} from "@mezon-tutors/shared";
import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  useAdminWalletTransactions,
  useAdminWalletTransactionStats,
  type AdminTransactionsFilters,
} from "@/services";
import TutorsPagination from "@/views/main/tutors/components/TutorsPagination";
import TransactionMetricsCards from "./components/TransactionMetricsCards";
import TransactionsTable from "./components/TransactionsTable";

const TRANSACTION_TYPES: WalletTransactionType[] = [
  "BOOKING_PAYMENT",
  "RELEASE",
  "WITHDRAWAL",
  "REFUND",
  "PLATFORM_FEE",
];

const TRANSACTION_DIRECTIONS: WalletTransactionDirection[] = [
  "CREDIT",
  "DEBIT",
];

export default function AdminTransactionsView() {
  const t = useTranslations("Admin.Transactions");
  const tTypes = useTranslations("Wallet.types");
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<WalletTransactionType | "">("");
  const [directionFilter, setDirectionFilter] = useState<
    WalletTransactionDirection | ""
  >("");

  const filters: AdminTransactionsFilters = {
    ...(typeFilter ? { type: typeFilter } : {}),
    ...(directionFilter ? { direction: directionFilter } : {}),
  };

  const { data: stats, isLoading: statsLoading } =
    useAdminWalletTransactionStats();
  const { data, isLoading, isFetching } = useAdminWalletTransactions(
    page,
    filters,
  );

  const transactions = data?.items ?? [];
  const totalPages = data?.meta?.totalPages ?? 1;

  const handleFilterChange = (
    nextType: WalletTransactionType | "",
    nextDirection: WalletTransactionDirection | "",
  ) => {
    setTypeFilter(nextType);
    setDirectionFilter(nextDirection);
    setPage(1);
  };

  return (
    <div className="mx-auto w-full max-w-[1280px] p-4 md:p-6">
      <div className="mb-6 flex flex-col gap-1">
        <h2 className="text-2xl font-bold text-slate-900">{t("title")}</h2>
        <p className="text-sm text-slate-600">{t("description")}</p>
      </div>

      <div className="mb-6">
        <TransactionMetricsCards stats={stats} isLoading={statsLoading} />
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-base font-semibold text-slate-900">
          {t("list.title")}
        </h3>
        <div className="flex flex-wrap gap-2">
          <select
            value={typeFilter}
            onChange={(e) =>
              handleFilterChange(
                e.target.value as WalletTransactionType | "",
                directionFilter,
              )
            }
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          >
            <option value="">{t("filters.allTypes")}</option>
            {TRANSACTION_TYPES.map((type) => (
              <option key={type} value={type}>
                {tTypes(type)}
              </option>
            ))}
          </select>
          <select
            value={directionFilter}
            onChange={(e) =>
              handleFilterChange(
                typeFilter,
                e.target.value as WalletTransactionDirection | "",
              )
            }
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          >
            <option value="">{t("filters.allDirections")}</option>
            {TRANSACTION_DIRECTIONS.map((direction) => (
              <option key={direction} value={direction}>
                {t(`list.direction.${direction}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <TransactionsTable transactions={transactions} isLoading={isLoading} />

      <div className="pt-6">
        <TutorsPagination
          page={page}
          totalPages={totalPages}
          isFetching={isFetching}
          onPageChangeAction={setPage}
        />
      </div>
    </div>
  );
}
