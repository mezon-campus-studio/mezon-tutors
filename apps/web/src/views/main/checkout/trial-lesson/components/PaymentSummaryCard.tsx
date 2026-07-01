"use client";

import { Receipt, TicketPercent, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button, Input } from "@/components/ui";
import { ECurrency, formatToCurrency } from "@mezon-tutors/shared";
import {
  isVnpayMinWalletCapApplied,
  VNPAY_MIN_AMOUNT_VND,
} from "./wallet-payment";

type PaymentSummaryCardProps = {
  durationMinutes: number;
  totalDisplay: string;
  lessonPrice?: number;
  walletBalance?: number;
  showWalletRow?: boolean;
  useWalletBalance?: boolean;
  onUseWalletBalanceChange?: (value: boolean) => void;
  deductFromWallet?: number;
  vnpayAmount?: number;
};

function WalletBalanceToggle({
  checked,
  onCheckedChange,
  label,
}: {
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-violet-100 bg-violet-50/40 px-4 py-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-gradient-135 text-white shadow-sm shadow-violet-200/50">
          <Wallet className="size-3.5" />
        </div>
        <p className="truncate text-sm font-semibold text-slate-800">{label}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onCheckedChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2 ${
          checked ? "bg-violet-600" : "bg-slate-200"
        }`}
      >
        <span
          className={`pointer-events-none inline-block size-5 rounded-full bg-white shadow-sm ring-0 transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

export function PaymentSummaryCard({
  durationMinutes,
  totalDisplay,
  lessonPrice = 0,
  walletBalance = 0,
  showWalletRow = false,
  useWalletBalance = false,
  onUseWalletBalanceChange,
  deductFromWallet = 0,
  vnpayAmount = 0,
}: PaymentSummaryCardProps) {
  const t = useTranslations("TrialLessonCheckout.PaymentSummaryCard");
  const walletBalanceDisplay = formatToCurrency(ECurrency.VND, walletBalance);
  const deductDisplay = formatToCurrency(ECurrency.VND, deductFromWallet);
  const vnpayRemainderDisplay = formatToCurrency(ECurrency.VND, vnpayAmount);
  const vnpayMinDisplay = formatToCurrency(ECurrency.VND, VNPAY_MIN_AMOUNT_VND);
  const showWalletBreakdown = useWalletBalance && vnpayAmount > 0;
  const showVnpayMinWalletNote = isVnpayMinWalletCapApplied(
    lessonPrice,
    walletBalance,
    { deductFromWallet, vnpayAmount },
    useWalletBalance,
  );

  return (
    <div className="overflow-hidden rounded-3xl border border-violet-100 bg-white shadow-sm shadow-violet-100/40">
      <div className="flex items-center gap-3 border-b border-violet-100 bg-[linear-gradient(180deg,#faf7ff_0%,#ffffff_100%)] px-5 py-4">
        <div className="flex size-9 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#ede9fe,#fce7f3)] text-violet-700 ring-1 ring-violet-100">
          <Receipt className="size-4" />
        </div>
        <div className="leading-tight">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-500">
            Summary
          </p>
          <h3 className="text-base font-extrabold text-slate-900 sm:text-lg">
            {t("title")}
          </h3>
        </div>
      </div>

      <div className="space-y-4 px-5 py-4">
        <div className="flex items-center justify-between text-sm">
          <p className="text-slate-600">
            {t("trialLesson", { durationMinutes })}
          </p>
          <p className="font-bold text-slate-900">{totalDisplay}</p>
        </div>

        <div className="rounded-2xl bg-[linear-gradient(110deg,#faf5ff,#fdf2f8)] px-4 py-3 ring-1 ring-violet-100">
          <div className="flex items-center justify-between">
            <p className="text-base font-extrabold text-slate-900">
              {t("total")}
            </p>
            <p className="text-brand-gradient text-2xl font-extrabold tracking-tight">
              {totalDisplay}
            </p>
          </div>
        </div>

        {showWalletRow ? (
          <WalletBalanceToggle
            checked={useWalletBalance}
            onCheckedChange={(value) => onUseWalletBalanceChange?.(value)}
            label={t("walletBalance", { balance: walletBalanceDisplay })}
          />
        ) : null}

        {showWalletBreakdown ? (
          <div className="space-y-2 rounded-2xl border border-violet-100/80 bg-white px-4 py-3">
            <div className="flex items-center justify-between text-sm">
              <p className="text-slate-600">{t("payViaWallet")}</p>
              <p className="font-semibold text-emerald-600">-{deductDisplay}</p>
            </div>
            {showVnpayMinWalletNote ? (
              <p className="text-xs leading-relaxed text-slate-500">
                {t("vnpayMinWalletNote", {
                  minAmount: vnpayMinDisplay,
                  walletBalance: walletBalanceDisplay,
                  deductAmount: deductDisplay,
                })}
              </p>
            ) : null}
            <div className="flex items-center justify-between text-sm">
              <p className="text-slate-600">{t("remainingViaVnpay")}</p>
              <p className="font-bold text-slate-900">{vnpayRemainderDisplay}</p>
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
            <TicketPercent className="size-3.5 text-violet-500" />
            {t("promoCode")}
          </div>
          <div className="flex gap-2">
            <Input
              className="h-11 rounded-full border-slate-200 bg-slate-50/60 px-4 text-sm transition-colors focus-visible:border-violet-300 focus-visible:bg-white focus-visible:ring-violet-200/60"
              placeholder={t("promoPlaceholder")}
            />
            <Button
              variant="outline"
              className="h-11 rounded-full border-slate-200 px-5 text-xs font-semibold text-slate-700 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
            >
              {t("apply")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
