"use client";

import { Receipt, TicketPercent } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button, Input } from "@/components/ui";

type PaymentSummaryCardProps = {
  durationMinutes: number;
  totalDisplay: string;
};

export function PaymentSummaryCard({
  durationMinutes,
  totalDisplay,
}: PaymentSummaryCardProps) {
  const t = useTranslations("TrialLessonCheckout.PaymentSummaryCard");

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
            <p className="bg-[linear-gradient(135deg,#7c3aed,#9333ea,#ec4899)] bg-clip-text text-2xl font-extrabold tracking-tight text-transparent">
              {totalDisplay}
            </p>
          </div>
        </div>

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
