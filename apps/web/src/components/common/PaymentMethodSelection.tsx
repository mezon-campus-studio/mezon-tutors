"use client";

import { ArrowRight, CreditCard, Lock, Shield } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui";

export type PaymentMethodOption = {
  id: string;
  title: string;
  subtitle: string;
  disabled?: boolean;
};
export type PaymentMethodId = "sepay";

const PAYMENT_METHOD_IDS: PaymentMethodId[] = ["sepay"];

const METHOD_ACCENT: Record<PaymentMethodId, string> = {
  sepay: "from-sky-500 to-blue-500",
};

type PaymentMethodSelectionProps = {
  totalDisplay?: string;
  onPayAction: (methodId: PaymentMethodId) => void | Promise<void>;
  onWalletPayAction?: () => void | Promise<void>;
  onContinuePaymentAction?: () => void;
  showContinuePayment?: boolean;
  continuePaymentDisabled?: boolean;
  payDisabled?: boolean;
  isPayLoading?: boolean;
  payWithWalletOnly?: boolean;
  bookAndPayLabel?: string;
  walletPayLabel?: string;
};

export function PaymentMethodSelection({
  totalDisplay,
  onPayAction,
  onWalletPayAction,
  onContinuePaymentAction,
  showContinuePayment = false,
  continuePaymentDisabled = false,
  payDisabled = false,
  isPayLoading = false,
  payWithWalletOnly = false,
  bookAndPayLabel,
  walletPayLabel,
}: PaymentMethodSelectionProps) {
  const t = useTranslations("TrialLessonCheckout.Screen");
  const tPanel = useTranslations("Common.PaymentMethodSelection");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMethodId, setSelectedMethodId] =
    useState<PaymentMethodId>("sepay");
  const paymentMethods = useMemo<PaymentMethodOption[]>(
    () =>
      PAYMENT_METHOD_IDS.map((methodId) => ({
        id: methodId,
        title: t(`paymentMethods.${methodId}.title`),
        subtitle: t(`paymentMethods.${methodId}.subtitle`),
      })),
    [t],
  );

  const hasContinuePayment =
    showContinuePayment && Boolean(onContinuePaymentAction);
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
      if (payWithWalletOnly) {
        await onWalletPayAction?.();
      } else {
        await onPayAction(selectedMethodId);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-violet-100 bg-white shadow-sm shadow-violet-100/40">
      <div className="flex items-center gap-3 border-b border-violet-100 bg-[linear-gradient(180deg,#faf7ff_0%,#ffffff_100%)] px-5 py-4">
        <div className="flex size-9 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#ede9fe,#fce7f3)] text-violet-700 ring-1 ring-violet-100">
          <CreditCard className="size-4" />
        </div>
        <div className="leading-tight">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-500">
            Payment
          </p>
          <h3 className="text-base font-extrabold text-slate-900 sm:text-lg">
            {tPanel("title")}
          </h3>
        </div>
      </div>

      {!payWithWalletOnly ? (
        <div className="space-y-2.5 px-5 py-4">
          {paymentMethods.map((method) => {
          const methodId = method.id as PaymentMethodId;
          const isDisabled = Boolean(method.disabled);
          const active = !isDisabled && selectedMethodId === method.id;
          const accent =
            METHOD_ACCENT[methodId] ?? "from-violet-500 to-purple-500";
          return (
            <button
              key={method.id}
              type="button"
              disabled={isDisabled}
              className={`group relative flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all ${
                isDisabled
                  ? "cursor-not-allowed border-slate-100 bg-slate-50/80 opacity-70"
                  : active
                    ? "cursor-pointer border-violet-300 bg-[linear-gradient(110deg,#faf5ff,#fdf2f8)] shadow-sm shadow-violet-200/40"
                    : "cursor-pointer border-slate-200 bg-white hover:border-violet-200 hover:bg-violet-50/30"
              }`}
              onClick={() => {
                if (!isDisabled) {
                  setSelectedMethodId(methodId);
                }
              }}
            >
              <div
                className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm transition-all ${
                  isDisabled
                    ? "bg-slate-200 text-slate-400 shadow-none"
                    : active
                      ? `bg-gradient-to-br ${accent} shadow-violet-300/40`
                      : "bg-slate-100 text-slate-500 shadow-none group-hover:bg-violet-100 group-hover:text-violet-700"
                }`}
              >
                <CreditCard className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={`truncate text-sm font-extrabold ${isDisabled ? "text-slate-500" : active ? "text-violet-900" : "text-slate-900"}`}
                >
                  {method.title}
                </p>
                <p
                  className={`truncate text-xs ${isDisabled ? "text-slate-400" : active ? "text-violet-600" : "text-slate-500"}`}
                >
                  {isDisabled ? tPanel("methodUnavailable") : method.subtitle}
                </p>
              </div>
              <div
                className={`flex size-5 shrink-0 items-center justify-center rounded-full transition-all ${
                  isDisabled
                    ? "bg-slate-100 ring-1 ring-slate-200"
                    : active
                      ? "bg-[linear-gradient(135deg,#7c3aed,#ec4899)]"
                      : "bg-white ring-1 ring-slate-200"
                }`}
              >
                {active ? (
                  <span className="size-1.5 rounded-full bg-white" />
                ) : null}
              </div>
            </button>
          );
        })}
        </div>
      ) : null}

      <div className={`space-y-3 bg-[linear-gradient(180deg,#ffffff_0%,#faf7ff_100%)] px-5 py-4 ${payWithWalletOnly ? "" : "border-t border-violet-100"}`}>
        <Button
          className="group h-12 w-full rounded-full bg-[linear-gradient(110deg,#7c3aed_0%,#9333ea_50%,#db2777_100%)] text-sm font-semibold text-white shadow-md shadow-violet-300/40 transition-all hover:shadow-lg hover:shadow-violet-400/50 disabled:bg-slate-200 disabled:bg-none disabled:text-slate-400 disabled:shadow-none"
          disabled={primaryButtonDisabled}
          onClick={handlePrimaryPress}
        >
          {hasContinuePayment ? (
            tPanel("continuePayment")
          ) : isPayLoading || isSubmitting ? (
            tPanel("processing")
          ) : (
            <>
              <Lock className="mr-1.5 size-4" />
              {payWithWalletOnly
                ? walletPayLabel ??
                  (totalDisplay
                    ? tPanel("payWithWallet", { amount: totalDisplay })
                    : tPanel("bookLesson"))
                : bookAndPayLabel ??
                  (totalDisplay
                    ? tPanel("bookAndPay", { amount: totalDisplay })
                    : tPanel("bookLesson"))}
              <ArrowRight className="ml-1 size-4 transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </Button>

        <p className="inline-flex w-full items-center justify-center gap-1.5 text-center text-[11px] text-slate-500">
          <Shield className="size-3.5 text-emerald-500" />
          {tPanel("securityNotice")}
        </p>
      </div>
    </div>
  );
}
