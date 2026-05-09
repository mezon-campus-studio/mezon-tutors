"use client";

import dayjs from "dayjs";
import { CalendarIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "@/components/ui";
import { useCurrency } from "@/hooks";
import {
  useCreateTrialLessonBookingMutation,
  useGetCurrentTrialLessonBooking,
  useGetVerifiedTutorAbout,
} from "@/services";
import { ECurrency, formatToCurrency } from "@mezon-tutors/shared";
import { PaymentMethodId, PaymentMethodSelection } from "@/components/common/PaymentMethodSelection";
import { PaymentSummaryCard } from "./components/PaymentSummaryCard";
import { TrialLessonDetailsCard } from "./components/TrialLessonDetailsCard";

export default function TrialLessonCheckoutPage() {
  const t = useTranslations("TrialLessonCheckout.Screen");
  const { currency } = useCurrency();
  const searchParams = useSearchParams();
  const currentSearchParams = searchParams ?? new URLSearchParams();

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

  if (!query) {
    return (
      <div className="min-h-screen bg-background px-5 py-10 text-foreground">
        <div className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-2 text-center">
          <p className="text-2xl font-bold">{t("missingInfo.title")}</p>
          <p className="text-muted-foreground">{t("missingInfo.description")}</p>
          <p className="text-sm text-muted-foreground">{t("missingInfo.expectedQuery")}</p>
        </div>
      </div>
    );
  }

  const start = dayjs(query.startAt);
  const end = start.add(query.durationMinutes, "minute");
  const dateLabel = start.format("MMM D, YYYY");
  const timeLabel = `${start.format("h:mm A")} - ${end.format("h:mm A")}`;
  const durationLabel = t("durationLabel", { durationMinutes: query.durationMinutes });

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
  const unitPrice =
    currency === ECurrency.USD
      ? (lessonPrice?.usd ?? 0)
      : currency === ECurrency.PHP
        ? (lessonPrice?.php ?? 0)
        : (lessonPrice?.vnd ?? 0);
  const hasPrice = unitPrice > 0;
  const total = Math.round((query.durationMinutes / 60) * unitPrice * 100) / 100;
  const totalDisplay = hasPrice ? formatToCurrency(currency, total) : undefined;

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
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-[1240px] px-3 py-4 pb-9 sm:px-5">
        <div className="space-y-1">
          <h1 className="text-4xl leading-tight font-extrabold sm:text-5xl">{t("title")}</h1>
          <p className="text-lg text-muted-foreground">
            {isTutorPending ? t("loadingBooking") : t("subtitle", { tutorName: tutorLastName })}
          </p>
        </div>

        <div className="mt-4 space-y-2">
          {isTutorError ? <p className="text-red-400">{t("errors.loadTutor")}</p> : null}
          {!isTutorPending && tutor && !hasPrice ? (
            <p className="text-red-400">{t("errors.missingRate")}</p>
          ) : null}
          {!isCurrentBookingLoading && isPendingPayment ? (
            <p className="text-primary">{t("pendingPaymentNotice")}</p>
          ) : null}
          {!isCurrentBookingLoading && isBookedAndLocked ? (
            <p className="text-amber-400">{t("bookedLockedNotice")}</p>
          ) : null}
        </div>

        <div className="mt-4 flex flex-col items-start gap-4 lg:flex-row">
          <div className="w-full flex-1 space-y-3.5 lg:basis-2/3">
            <div className="flex items-center gap-2">
              <CalendarIcon size={20} className="text-primary" />
              <p className="text-xl font-bold">{t("trialLessonDetails")}</p>
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
              <PaymentSummaryCard durationMinutes={query.durationMinutes} totalDisplay={totalDisplay ?? ""} />
            ) : (
              <p className="text-muted-foreground">{t("loadingPaymentSummary")}</p>
            )}
          </div>

          <div className="w-full lg:max-w-[460px] lg:basis-1/3">
            <PaymentMethodSelection
              totalDisplay={tutor && hasPrice ? totalDisplay : undefined}
              onPayAction={handlePay}
              onContinuePaymentAction={handleContinuePayment}
              showContinuePayment={isPendingPayment && Boolean(paymentLink)}
              continuePaymentDisabled={isCurrentBookingLoading}
              payDisabled={
                !canPay ||
                isCurrentBookingLoading ||
                isBookedAndLocked
              }
              isPayLoading={createBooking.isPending || isCurrentBookingLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
