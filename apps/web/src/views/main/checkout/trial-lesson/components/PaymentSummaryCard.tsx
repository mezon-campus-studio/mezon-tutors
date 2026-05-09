"use client";

import { useTranslations } from "next-intl";
import { Button, Input } from "@/components/ui";

type PaymentSummaryCardProps = {
  durationMinutes: number;
  totalDisplay: string;
};

export function PaymentSummaryCard({ durationMinutes, totalDisplay }: PaymentSummaryCardProps) {
  const t = useTranslations("TrialLessonCheckout.PaymentSummaryCard");

  return (
    <div className="space-y-3 rounded-[20px] border border-primary bg-card p-3.5">
      <h3 className="text-xl font-bold text-foreground">{t("title")}</h3>

      <div className="flex items-center justify-between">
        <p className="text-muted-foreground">{t("trialLesson", { durationMinutes })}</p>
        <p className="font-bold text-foreground">{totalDisplay}</p>
      </div>

      <div className="flex items-center justify-between border-t pt-2">
        <p className="text-xl font-bold text-foreground">{t("total")}</p>
        <p className="text-xl font-extrabold text-primary">{totalDisplay}</p>
      </div>

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.6px] text-muted-foreground">{t("promoCode")}</p>
        <div className="flex gap-2">
          <Input
            className="h-[42px]"
            placeholder={t("promoPlaceholder")}
          />
          <Button variant="outline" className="h-[42px]">
            {t("apply")}
          </Button>
        </div>
      </div>
    </div>
  );
}
