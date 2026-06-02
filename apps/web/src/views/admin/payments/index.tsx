"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useAdminWalletWithdrawals } from "@/services";
import WithdrawalsTable from "./components/WithdrawalsTable";
import TutorsPagination from "@/views/main/tutors/components/TutorsPagination";

export default function AdminPaymentsView() {
  const t = useTranslations("Admin.Payments");
  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching } = useAdminWalletWithdrawals(page);

  const withdrawals = data?.items ?? [];
  const totalPages = data?.meta?.totalPages ?? 1;

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
  };

  return (
    <div className="mx-auto w-full max-w-[1280px] p-4 md:p-6">
      <div className="mb-6 flex flex-col gap-1">
        <h2 className="text-2xl font-bold text-slate-900">
          {t("title")}
        </h2>
        <p className="text-sm text-slate-600">{t("description")}</p>
      </div>

      <WithdrawalsTable withdrawals={withdrawals} isLoading={isLoading} />

      <div className="pt-6">
        <TutorsPagination
          page={page}
          totalPages={totalPages}
          isFetching={isFetching}
          onPageChangeAction={handlePageChange}
        />
      </div>
    </div>
  );
}
