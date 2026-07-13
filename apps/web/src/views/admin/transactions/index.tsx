"use client";

import type { WalletTransactionDirection } from "@mezon-tutors/shared";
import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import dayjs from "dayjs";
import { CalendarIcon, RotateCcw, XIcon } from "lucide-react";
import {
  useAdminWalletTransactions,
  useAdminWalletTransactionStats,
  useSearchTutors,
  type AdminTransactionsFilters,
} from "@/services";
import {
  Combobox,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxInput,
  ComboboxEmpty,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Calendar,
} from "@/components/ui";
import TutorsPagination from "@/views/main/tutors/components/TutorsPagination";
import TransactionMetricsCards from "./components/TransactionMetricsCards";
import TransactionsTable from "./components/TransactionsTable";

const TRANSACTION_DIRECTIONS: WalletTransactionDirection[] = [
  "CREDIT",
  "DEBIT",
];

type PeriodKey = "today" | "week" | "month" | "all";

function getPeriodDates(period: PeriodKey): { startDate?: string; endDate?: string } {
  switch (period) {
    case "today": {
      const start = dayjs().startOf("day");
      const end = dayjs().endOf("day");
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }
    case "week": {
      const start = dayjs().startOf("week");
      const end = dayjs().endOf("week");
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }
    case "month": {
      const start = dayjs().startOf("month");
      const end = dayjs().endOf("month");
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }
    default:
      return {};
  }
}

export default function AdminTransactionsView() {
  const t = useTranslations("Admin.Transactions");
  const tFilters = useTranslations("Admin.Transactions.filters");

  const [page, setPage] = useState(1);
  const [directionFilter, setDirectionFilter] = useState<WalletTransactionDirection | "">("");
  const [period, setPeriod] = useState<PeriodKey>("all");
  const [tutorSearch, setTutorSearch] = useState("");
  const [selectedTutorId, setSelectedTutorId] = useState<string | null>(null);
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
  const [dateOpen, setDateOpen] = useState(false);

  const { data: tutors } = useSearchTutors(tutorSearch);

  const hasCustomRange = !!(customStartDate && customEndDate);

  const periodDates = useMemo(() => getPeriodDates(period), [period]);

  const filters: AdminTransactionsFilters = {
    ...(directionFilter ? { direction: directionFilter as WalletTransactionDirection } : {}),
    ...(hasCustomRange
      ? {
          startDate: customStartDate!.toISOString(),
          endDate: customEndDate!.toISOString(),
        }
      : {
          ...(periodDates.startDate ? { startDate: periodDates.startDate } : {}),
          ...(periodDates.endDate ? { endDate: periodDates.endDate } : {}),
        }),
    ...(selectedTutorId ? { tutorId: selectedTutorId } : {}),
  };

  const statsStartDate = hasCustomRange ? customStartDate!.toISOString() : undefined;
  const statsEndDate = hasCustomRange ? customEndDate!.toISOString() : undefined;

  const { data: stats, isLoading: statsLoading, isFetching: statsFetching } = useAdminWalletTransactionStats(
    selectedTutorId ?? undefined,
    statsStartDate,
    statsEndDate,
  );
  const { data, isLoading, isFetching } = useAdminWalletTransactions(page, filters);

  const transactions = data?.items ?? [];
  const totalPages = data?.meta?.totalPages ?? 1;

  const handleDirectionChange = useCallback((value: string | null) => {
    setDirectionFilter((value ?? "") as WalletTransactionDirection | "");
    setPage(1);
  }, []);

  const handlePeriodChange = useCallback((next: PeriodKey) => {
    setPeriod(next);
    setPage(1);
  }, []);

  const handleCustomDate = useCallback((date: Date | undefined) => {
    if (!date) return;
    if (!customStartDate || (customStartDate && customEndDate)) {
      setCustomStartDate(dayjs(date).startOf("day").toDate());
      setCustomEndDate(null);
    } else {
      setCustomEndDate(dayjs(date).endOf("day").toDate());
      setPage(1);
      setDateOpen(false);
    }
  }, [customStartDate, customEndDate]);

  const clearCustomRange = useCallback(() => {
    setCustomStartDate(null);
    setCustomEndDate(null);
    setPage(1);
  }, []);

  const clearAllFilters = useCallback(() => {
    setPeriod("all");
    setDirectionFilter("");
    setSelectedTutorId(null);
    setTutorSearch("");
    setCustomStartDate(null);
    setCustomEndDate(null);
    setPage(1);
  }, []);

  const selectedTutor = tutors?.find((t) => t.id === selectedTutorId) ?? null;

  const PERIODS: PeriodKey[] = ["today", "week", "month", "all"];

  const customLabel = hasCustomRange
    ? `${dayjs(customStartDate).format("DD/MM")} - ${dayjs(customEndDate).format("DD/MM")}`
    : customStartDate
      ? dayjs(customStartDate).format("DD/MM/YYYY")
      : tFilters("period.custom");

  const hasAnyFilter = directionFilter !== "" || selectedTutorId !== null || hasCustomRange || period !== "all";

  return (
    <div className="mx-auto w-full max-w-[1280px] p-4 md:p-6">
      <div className="mb-6 flex flex-col gap-1">
        <h2 className="text-2xl font-bold text-slate-900">{t("title")}</h2>
        <p className="text-sm text-slate-600">{t("description")}</p>
      </div>

      <div className={`transition-opacity ${statsFetching && !statsLoading ? "opacity-60" : ""}`}>
        <TransactionMetricsCards
          stats={stats}
          isLoading={statsLoading}
          period={hasCustomRange ? "total" : period === "all" ? "total" : period}
        />
      </div>

      <div className="my-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {PERIODS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => handlePeriodChange(key)}
              className={`rounded-lg cursor-pointer px-3 py-1.5 text-sm font-medium transition-colors ${
                period === key
                  ? "bg-violet-100 text-violet-800"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {tFilters(`period.${key}`)}
            </button>
          ))}

          <Popover open={dateOpen} onOpenChange={setDateOpen}>
            <PopoverTrigger
              className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium transition-colors hover:bg-slate-50 ${
                hasCustomRange
                  ? "bg-violet-100 text-violet-800"
                  : "text-slate-600"
              }`}
            >
              <CalendarIcon className="h-4 w-4" />
              {customLabel}
              {hasCustomRange && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    clearCustomRange();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.stopPropagation();
                      clearCustomRange();
                    }
                  }}
                  className="ml-1 cursor-pointer rounded p-0.5 text-rose-600 hover:bg-rose-100"
                >
                  <XIcon className="h-3.5 w-3.5" />
                </span>
              )}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={(customEndDate ?? customStartDate) ?? undefined}
                onSelect={handleCustomDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Combobox
            value={selectedTutor?.displayName ?? undefined}
            onValueChange={(v: string | null) => {
              const tutor = tutors?.find((t) => t.displayName === v);
              setSelectedTutorId(tutor?.id ?? null);
              setTutorSearch("");
              setPage(1);
            }}
            onInputValueChange={(v: string) => setTutorSearch(v)}
          >
            <ComboboxInput
              placeholder={tFilters("tutorPlaceholder")}
              className="w-56"
              showTrigger
              showClear={!!selectedTutorId}
            />
            <ComboboxContent>
              <ComboboxList>
                {(!tutors || tutors.length === 0) && (
                  <ComboboxEmpty>
                    {tutorSearch ? t("list.empty") : tFilters("tutorPlaceholder")}
                  </ComboboxEmpty>
                )}
                {tutors?.map((tutor) => (
                  <ComboboxItem key={tutor.id} value={tutor.displayName}>
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-900">
                        {tutor.displayName}
                      </span>
                      <span className="text-xs text-slate-500">{tutor.email}</span>
                    </div>
                  </ComboboxItem>
                ))}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>

          <Select
            value={directionFilter}
            onValueChange={handleDirectionChange}
          >
            <SelectTrigger className="h-9 w-40">
              <SelectValue>
                {(value: string) =>
                  value
                    ? t(`list.direction.${value}`)
                    : t("filters.allDirections")
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t("filters.allDirections")}</SelectItem>
              {TRANSACTION_DIRECTIONS.map((d) => (
                <SelectItem key={d} value={d}>
                  {t(`list.direction.${d}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasAnyFilter && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50"
            >
              <RotateCcw className="h-4 w-4" />
              {tFilters("clearFilters")}
            </button>
          )}
        </div>
      </div>

      <div className="relative">
        {isFetching && !isLoading && (
          <div className="absolute inset-0 z-10 flex items-start justify-center rounded-xl bg-white/60 pt-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
          </div>
        )}
        <TransactionsTable transactions={transactions} isLoading={isLoading} />
      </div>

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
