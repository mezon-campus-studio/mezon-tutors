"use client";

import { ArrowRightIcon, WalletIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui";

export type PaymentMethodOption = {
  id: string;
  title: string;
  subtitle: string;
};
export type PaymentMethodId = "vnpay" | "paypal";

const PAYMENT_METHOD_IDS: PaymentMethodId[] = ["vnpay", "paypal"];

type PaymentMethodSelectionProps = {
  totalDisplay?: string;
  onPayAction: (methodId: PaymentMethodId) => void | Promise<void>;
  onContinuePaymentAction?: () => void;
  showContinuePayment?: boolean;
  continuePaymentDisabled?: boolean;
  payDisabled?: boolean;
  isPayLoading?: boolean;
};

export function PaymentMethodSelection({
  totalDisplay,
  onPayAction,
  onContinuePaymentAction,
  showContinuePayment = false,
  continuePaymentDisabled = false,
  payDisabled = false,
  isPayLoading = false,
}: PaymentMethodSelectionProps) {
  const t = useTranslations("TrialLessonCheckout.Screen");
  const tPanel = useTranslations("Common.PaymentMethodSelection");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMethodId, setSelectedMethodId] = useState<PaymentMethodId>("vnpay");
  const paymentMethods = useMemo<PaymentMethodOption[]>(
    () =>
      PAYMENT_METHOD_IDS.map((methodId) => ({
        id: methodId,
        title: t(`paymentMethods.${methodId}.title`),
        subtitle: t(`paymentMethods.${methodId}.subtitle`),
      })),
    [t],
  );

  const hasContinuePayment = showContinuePayment && Boolean(onContinuePaymentAction);
  const primaryButtonDisabled = hasContinuePayment
    ? continuePaymentDisabled || isSubmitting
    : payDisabled || isPayLoading || isSubmitting;

  const handlePrimaryPress = async () => {
    if (hasContinuePayment) {
      onContinuePaymentAction?.();
      return;
    }

    try {
      setIsSubmitting(true);
      await onPayAction(selectedMethodId);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-w-[320px] space-y-3 rounded-[20px] border border-primary bg-card p-4">
      <h3 className="text-3xl leading-9 font-extrabold text-foreground">{tPanel("title")}</h3>

      <div className="space-y-2.5">
        {paymentMethods.map((method) => {
          const active = selectedMethodId === method.id;
          return (
            <button
              key={method.id}
              type="button"
              className={`flex min-h-14 w-full cursor-pointer items-center justify-between gap-2.5 rounded-[14px] border px-3 text-left ${
                active ? "border-primary bg-primary/10" : "border-border bg-background"
              }`}
              onClick={() => setSelectedMethodId(method.id as PaymentMethodId)}
            >
              <div className="flex flex-1 items-center gap-2.5">
                <WalletIcon size={18} className={active ? "text-primary" : "text-muted-foreground"} />
                <div className="flex-1">
                  <p className="font-bold text-foreground">{method.title}</p>
                  <p className="text-sm text-muted-foreground">{method.subtitle}</p>
                </div>
              </div>
              <div
                className={`flex size-[18px] items-center justify-center rounded-full border ${
                  active ? "border-primary" : "border-muted-foreground/40"
                }`}
              >
                {active ? <span className="size-2 rounded-full bg-primary" /> : null}
              </div>
            </button>
          );
        })}
      </div>

      <Button
        className="h-12 w-full rounded-[14px] font-semibold"
        disabled={primaryButtonDisabled}
        onClick={handlePrimaryPress}
      >
        {hasContinuePayment
          ? tPanel("continuePayment")
          : isPayLoading || isSubmitting
            ? tPanel("processing")
            : totalDisplay
              ? tPanel("bookAndPay", { amount: totalDisplay })
              : tPanel("bookLesson")}
        {!isPayLoading && !isSubmitting ? <ArrowRightIcon className="ml-1 size-4" /> : null}
      </Button>

      <p className="text-center text-xs text-muted-foreground">{tPanel("securityNotice")}</p>
    </div>
  );
}
