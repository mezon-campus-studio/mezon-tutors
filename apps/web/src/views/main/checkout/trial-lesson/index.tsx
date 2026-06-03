"use client";

import { useAtomValue } from "jotai";
import { AlertCircle, CalendarCheck, Clock, Info } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  PaymentMethodId,
  PaymentMethodSelection,
} from "@/components/common/PaymentMethodSelection";
import { toast } from "@/components/ui";
import { useCurrency } from "@/hooks";
import {
  detectBrowserTimezone,
  formatInstantRangeLabels,
  normalizeTimezoneParam,
  resolveStableTimezone,
  resolveUserTimezone,
} from "@/lib/timezone";
import {
  useCreateTrialLessonBookingMutation,
  useGetCurrentTrialLessonBooking,
  useGetVerifiedTutorAbout,
  useWalletDetails,
} from "@/services";
import { userAtom } from "@/store";
import { ECurrency, formatToCurrency } from "@mezon-tutors/shared";
import { PaymentSummaryCard } from "./components/PaymentSummaryCard";
import { TrialLessonDetailsCard } from "./components/TrialLessonDetailsCard";
import { computeWalletPaymentSplit } from "./components/wallet-payment";

export default function TrialLessonCheckoutPage() {
  const t = useTranslations("TrialLessonCheckout.Screen");
  const { currency } = useCurrency();
  const currentUser = useAtomValue(userAtom);
  const searchParams = useSearchParams();
  const currentSearchParams = searchParams ?? new URLSearchParams();
  const timezoneFromQuery = useMemo(
    () => normalizeTimezoneParam(currentSearchParams.get("timezone")),
    [currentSearchParams],
  );
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const query = useMemo(() => {
    const tutorId = currentSearchParams.get("tutorId");
    const startAt = currentSearchParams.get("startAt");
    const durationRaw = currentSearchParams.get("durationMinutes");
    const dayRaw = currentSearchParams.get("dayOfWeek");
    if (!tutorId || !startAt || !durationRaw || dayRaw === null || dayRaw === "") {
      return null;
    }
    const durationMinutes = Number.parseInt(durationRaw, 10);
    const dayOfWeek = Number.parseInt(dayRaw, 10);
    if (Number.isNaN(durationMinutes) || durationMinutes <= 0) {
      return null;
    }
    if (Number.isNaN(dayOfWeek)) {
      return null;
    }
    return { tutorId, startAt, durationMinutes, dayOfWeek };
  }, [currentSearchParams]);

  const tutorId = query?.tutorId ?? "";
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const shouldLoadCurrentBooking = Boolean(tutorId);
  const {
    data: tutor,
    isPending: isTutorPending,
    isError: isTutorError,
  } = useGetVerifiedTutorAbout(tutorId);
  const {
    data: currentBooking,
    isPending: isCurrentBookingPending,
  } = useGetCurrentTrialLessonBooking(tutorId, shouldLoadCurrentBooking);
  const isCurrentBookingLoading = shouldLoadCurrentBooking && isCurrentBookingPending;
  const createBooking = useCreateTrialLessonBookingMutation();
  const { data: walletDetails } = useWalletDetails();
  const [useWalletBalance, setUseWalletBalance] = useState(false);

  const redirectToVnpay = useCallback((url: string) => {
    if (typeof window === "undefined") {
      return;
    }
    window.location.assign(url);
  }, []);

  useEffect(() => {
    if (
      currentBooking?.hasBooked &&
      currentBooking.status !== "CANCELLED" &&
      currentBooking.paymentStatus === "PENDING" &&
      currentBooking.paymentUrl
    ) {
      setPaymentLink(currentBooking.paymentUrl);
    }
  }, [currentBooking]);

  useEffect(() => {
    if (!currentBooking?.hasBooked || !currentBooking.paymentStatus) {
      return;
    }
    if (currentBooking.paymentStatus === "SUCCEEDED") {
      setPaymentLink(null);
    }
  }, [currentBooking]);

  const createVnpayBooking = useCallback(async () => {
    if (!query || !tutor) {
      return;
    }
    if (currentBooking?.hasBooked && currentBooking.status !== "CANCELLED") {
      if (currentBooking.paymentStatus === "PENDING" && currentBooking.paymentUrl) {
        setPaymentLink(currentBooking.paymentUrl);
        redirectToVnpay(currentBooking.paymentUrl);
        return;
      }
      toast.error(t("toast.alreadyBookedTitle"), { description: t("toast.alreadyBookedDescription") });
      return;
    }
    try {
      const booking = await createBooking.mutateAsync({
        tutorId: query.tutorId,
        startAt: query.startAt,
        dayOfWeek: query.dayOfWeek,
        durationMinutes: query.durationMinutes,
        currency,
      });
      setPaymentLink(booking.paymentUrl);
      if (booking.paymentUrl) {
        redirectToVnpay(booking.paymentUrl);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t("toast.bookingFailedFallback");
      toast.error(t("toast.bookingFailedTitle"), { description: message });
    }
  }, [createBooking, currency, currentBooking, redirectToVnpay, query, t, tutor]);

  const handleWalletPay = useCallback(async () => {
    toast.info(t("toast.walletPaymentComingSoonTitle"), {
      description: t("toast.walletPaymentComingSoonDescription"),
    });
  }, [t]);

  const paymentMethodHandlers = useMemo<Record<PaymentMethodId, () => Promise<void>>>(
    () => ({
      vnpay: createVnpayBooking,
      paypal: async () => {
        toast.error(t("toast.paypalUnavailableTitle"), {
          description: t("toast.paypalUnavailableDescription"),
        });
      },
    }),
    [createVnpayBooking, t],
  );

  const handlePay = useCallback(
    async (methodId: PaymentMethodId) => {
      const executePayment = paymentMethodHandlers[methodId];
      if (!executePayment) {
        toast.error(t("toast.bookingFailedTitle"), { description: t("toast.bookingFailedFallback") });
        return;
      }
      await executePayment();
    },
    [paymentMethodHandlers, t],
  );

  const handleContinuePayment = useCallback(() => {
    if (!paymentLink) {
      return;
    }
    redirectToVnpay(paymentLink);
  }, [redirectToVnpay, paymentLink]);

  const scheduleLabels = useMemo(() => {
    if (!query) {
      return { dateLabel: "—", timeLabel: "—" };
    }

    const stableTimezone = resolveStableTimezone(
      currentUser?.timezone,
      timezoneFromQuery,
    );
    const timezoneName = stableTimezone
      ? stableTimezone
      : hasMounted
        ? resolveUserTimezone(
            currentUser?.timezone,
            detectBrowserTimezone(),
          )
        : null;

    if (!timezoneName) {
      return { dateLabel: "—", timeLabel: "—" };
    }

    return formatInstantRangeLabels(
      query.startAt,
      query.durationMinutes,
      timezoneName,
    );
  }, [
    query,
    currentUser?.timezone,
    timezoneFromQuery,
    hasMounted,
  ]);

  const unitPrice = useMemo(() => {
    const lessonPrice = (
      tutor as
        | (typeof tutor & {
            prices?: {
              usd?: number;
              vnd?: number;
              php?: number;
            };
          })
        | undefined
    )?.prices;
    if (!lessonPrice) {
      return 0;
    }
    if (currency === ECurrency.USD) {
      return lessonPrice.usd ?? 0;
    }
    if (currency === ECurrency.PHP) {
      return lessonPrice.php ?? 0;
    }
    return lessonPrice.vnd ?? 0;
  }, [tutor, currency]);

  const hasPrice = unitPrice > 0;
  const total = useMemo(() => {
    if (!query || !hasPrice) {
      return 0;
    }
    return Math.round((query.durationMinutes / 60) * unitPrice * 100) / 100;
  }, [query, hasPrice, unitPrice]);

  const totalDisplay = hasPrice ? formatToCurrency(currency, total) : undefined;

  const walletBalance = useMemo(
    () =>
      currency === ECurrency.VND
        ? (walletDetails?.walletBalance ?? walletDetails?.availableBalance ?? 0)
        : 0,
    [currency, walletDetails],
  );
  const showWalletRow = currency === ECurrency.VND && walletBalance > 0;

  useEffect(() => {
    if (!showWalletRow) {
      setUseWalletBalance(false);
    }
  }, [showWalletRow]);

  const walletPayment = useMemo(
    () =>
      computeWalletPaymentSplit(
        total,
        walletBalance,
        useWalletBalance && showWalletRow,
      ),
    [total, walletBalance, useWalletBalance, showWalletRow],
  );

  const payWithWalletOnly =
    showWalletRow && useWalletBalance && walletPayment.vnpayAmount === 0;
  const paymentButtonAmountDisplay = payWithWalletOnly
    ? totalDisplay
    : useWalletBalance && showWalletRow && walletPayment.vnpayAmount > 0
      ? formatToCurrency(ECurrency.VND, walletPayment.vnpayAmount)
      : totalDisplay;

  if (!query) {
    return (
      <div className="relative min-h-screen overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,#faf7ff_0%,#ffffff_70%)]" />
          <div className="absolute -top-40 left-1/2 size-[44rem] -translate-x-1/2 rounded-full bg-violet-300/30 blur-[140px]" />
        </div>
        <div className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-3 px-5 py-20 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#fef3f2,#fee4e2)] ring-1 ring-rose-100">
            <AlertCircle className="size-6 text-rose-500" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">
            {t("missingInfo.title")}
          </p>
          <p className="text-sm leading-6 text-slate-600">
            {t("missingInfo.description")}
          </p>
        </div>
      </div>
    );
  }

  const { dateLabel, timeLabel } = scheduleLabels;
  const durationLabel = t("durationLabel", { durationMinutes: query.durationMinutes });

  const tutorLastName = tutor?.lastName?.trim() || t("tutor.fallbackName");
  const tutorDisplayName = tutor ? `${tutor.firstName} ${tutor.lastName}` : t("tutor.loadingName");
  const tutorSubtitle = tutor
    ? `${tutor.isProfessional ? t("tutor.professionalPrefix") : ""}${tutor.subject} ${t("tutor.subjectSuffix")}${tutor.experience ? ` • ${tutor.experience}` : ""}`
    : "";

  const canPay = Boolean(tutor) && !isTutorError && hasPrice;
  const hasActiveBooking = Boolean(currentBooking?.hasBooked && currentBooking.status !== "CANCELLED");
  const hasLocalPendingPayment = Boolean(paymentLink);
  const isPendingPayment = Boolean(
    hasLocalPendingPayment ||
      (hasActiveBooking &&
        currentBooking?.paymentStatus === "PENDING" &&
        (currentBooking?.paymentUrl || paymentLink)),
  );
  const isBookedAndLocked = Boolean(hasActiveBooking && currentBooking?.paymentStatus !== "PENDING");

  return (
    <div className="relative min-h-screen text-slate-900">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#faf7ff_0%,#ffffff_70%)]" />
        <div className="absolute -top-40 left-1/2 size-[44rem] -translate-x-1/2 rounded-full bg-violet-300/30 blur-[140px]" />
        <div className="absolute top-1/3 -right-24 size-[28rem] rounded-full bg-fuchsia-200/30 blur-[120px]" />
      </div>

      <div className="mx-auto w-full max-w-[1240px] px-4 py-8 pb-12 sm:px-6 sm:py-10">
        <div className="space-y-2">
          <h1 className="text-balance text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
            {t("title")}{" "}
            <span className="bg-[linear-gradient(110deg,#7c3aed_0%,#a855f7_50%,#ec4899_100%)] bg-clip-text text-transparent">
              ✨
            </span>
          </h1>
          <p className="text-sm text-slate-600 sm:text-base">
            {isTutorPending
              ? t("loadingBooking")
              : t("subtitle", { tutorName: tutorLastName })}
          </p>
        </div>

        <div className="mt-5 space-y-2">
          {isTutorError ? (
            <NoticeRow tone="error" message={t("errors.loadTutor")} />
          ) : null}
          {!isTutorPending && tutor && !hasPrice ? (
            <NoticeRow tone="error" message={t("errors.missingRate")} />
          ) : null}
          {!isCurrentBookingLoading && isPendingPayment ? (
            <NoticeRow tone="info" message={t("pendingPaymentNotice")} />
          ) : null}
          {!isCurrentBookingLoading && isBookedAndLocked ? (
            <NoticeRow tone="warning" message={t("bookedLockedNotice")} />
          ) : null}
        </div>

        <div className="mt-6 flex flex-col items-start gap-5 lg:flex-row">
          <div className="w-full flex-1 space-y-4 lg:basis-2/3">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#ede9fe,#fce7f3)] text-violet-700 ring-1 ring-violet-100">
                <CalendarCheck className="size-4" />
              </div>
              <div className="leading-tight">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-500">
                  Booking
                </p>
                <p className="text-base font-extrabold text-slate-900 sm:text-lg">
                  {t("trialLessonDetails")}
                </p>
              </div>
            </div>
            <TrialLessonDetailsCard
              tutorName={tutorDisplayName}
              tutorSubtitle={tutorSubtitle || t("tutor.emptySubtitle")}
              avatarUrl={tutor?.avatar ?? ""}
              dateLabel={dateLabel}
              timeLabel={timeLabel}
              durationLabel={durationLabel}
            />
            {tutor && hasPrice ? (
              <PaymentSummaryCard
                durationMinutes={query.durationMinutes}
                totalDisplay={totalDisplay ?? ""}
                lessonPrice={total}
                walletBalance={walletBalance}
                showWalletRow={showWalletRow}
                useWalletBalance={useWalletBalance}
                onUseWalletBalanceChange={setUseWalletBalance}
                deductFromWallet={walletPayment.deductFromWallet}
                vnpayAmount={walletPayment.vnpayAmount}
              />
            ) : (
              <div className="flex items-center gap-2 rounded-2xl border border-violet-100 bg-white px-4 py-3 text-sm text-slate-500">
                <Clock className="size-4 text-violet-400" />
                {t("loadingPaymentSummary")}
              </div>
            )}
          </div>

          <div className="w-full lg:sticky lg:top-24 lg:max-w-[460px] lg:basis-1/3">
            <PaymentMethodSelection
              totalDisplay={tutor && hasPrice ? paymentButtonAmountDisplay : undefined}
              onPayAction={handlePay}
              onWalletPayAction={handleWalletPay}
              payWithWalletOnly={payWithWalletOnly}
              onContinuePaymentAction={handleContinuePayment}
              showContinuePayment={isPendingPayment && Boolean(paymentLink)}
              continuePaymentDisabled={isCurrentBookingLoading}
              payDisabled={
                !canPay || isCurrentBookingLoading || isBookedAndLocked
              }
              isPayLoading={createBooking.isPending || isCurrentBookingLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function NoticeRow({
  tone,
  message,
}: {
  tone: "error" | "warning" | "info";
  message: string;
}) {
  const config =
    tone === "error"
      ? {
          icon: AlertCircle,
          bg: "bg-rose-50",
          ring: "ring-rose-100",
          text: "text-rose-700",
          iconColor: "text-rose-500",
        }
      : tone === "warning"
        ? {
            icon: AlertCircle,
            bg: "bg-amber-50",
            ring: "ring-amber-100",
            text: "text-amber-800",
            iconColor: "text-amber-500",
          }
        : {
            icon: Info,
            bg: "bg-[linear-gradient(110deg,#faf5ff,#fdf2f8)]",
            ring: "ring-violet-100",
            text: "text-violet-700",
            iconColor: "text-violet-500",
          };
  const Icon = config.icon;
  return (
    <div
      className={`flex items-start gap-2 rounded-xl ${config.bg} px-3 py-2.5 text-xs ring-1 ${config.ring}`}
    >
      <Icon className={`mt-0.5 size-4 shrink-0 ${config.iconColor}`} />
      <p className={`leading-5 ${config.text}`}>{message}</p>
    </div>
  );
}
