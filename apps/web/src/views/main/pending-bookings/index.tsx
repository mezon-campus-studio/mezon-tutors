"use client";

import { formatToCurrency, ROUTES } from "@mezon-tutors/shared";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import { Clock, CreditCard } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { Button, Card, CardContent, Skeleton } from "@/components/ui";
import { useUserTimezone } from "@/hooks";
import { formatInstantRangeLabels } from "@/lib/timezone";
import {
  useGetStudentPendingPaymentBookings,
  useGetStudentPendingPaymentEnrollments,
  type StudentPendingPaymentBooking,
  type StudentPendingPaymentEnrollment,
} from "@/services";

dayjs.extend(duration);

function formatCountdown(expiresAt: string, nowMs: number): string {
  const diff = new Date(expiresAt).getTime() - nowMs;
  if (diff <= 0) {
    return "";
  }
  const d = dayjs.duration(diff);
  const minutes = Math.floor(d.asMinutes());
  const seconds = d.seconds();
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

type PendingTrialItem = StudentPendingPaymentBooking & { kind: "trial" };
type PendingPlanItem = StudentPendingPaymentEnrollment & { kind: "plan" };
type PendingItem = PendingTrialItem | PendingPlanItem;

function PendingPaymentActions({
  expiresAt,
  paymentUrl,
  nowMs,
}: {
  expiresAt: string;
  paymentUrl: string | null;
  nowMs: number;
}) {
  const t = useTranslations("Dashboard.pendingBookings");
  const countdown = formatCountdown(expiresAt, nowMs);
  const isExpired = !countdown;

  const handlePay = () => {
    if (paymentUrl && typeof window !== "undefined") {
      window.location.assign(paymentUrl);
    }
  };

  return (
    <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
      <div
        className={`inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
          isExpired
            ? "bg-slate-100 text-slate-600"
            : "bg-amber-100 text-amber-900"
        }`}
      >
        <Clock className="size-3.5" />
        {isExpired ? t("expired") : t("expiresIn", { time: countdown })}
      </div>
      <Button
        size="sm"
        className="gap-2"
        disabled={isExpired || !paymentUrl}
        onClick={handlePay}
      >
        <CreditCard className="size-4" />
        {t("payNow")}
      </Button>
    </div>
  );
}

function PendingTrialCard({
  booking,
  nowMs,
}: {
  booking: PendingTrialItem;
  nowMs: number;
}) {
  const t = useTranslations("Dashboard.pendingBookings");
  const userTimezone = useUserTimezone();
  const { dateLabel, timeLabel } = formatInstantRangeLabels(
    booking.startAt,
    booking.durationMinutes,
    userTimezone,
  );

  return (
    <Card className="overflow-hidden border-violet-100">
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <Image
            src={booking.tutorAvatarUrl || "/images/default-avatar.png"}
            alt={booking.tutorName}
            width={48}
            height={48}
            className="size-12 shrink-0 rounded-xl object-cover"
          />
          <div className="min-w-0 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-violet-500">
              {t("trialBadge")}
            </p>
            <p className="font-semibold text-slate-900">
              {t("lessonWith", { tutor: booking.tutorName })}
            </p>
            <p className="text-sm text-slate-600">
              {dateLabel}
              <span className="mx-1.5 text-slate-300">·</span>
              {timeLabel}
            </p>
            <p className="text-xs text-slate-500">
              {t("duration", { minutes: booking.durationMinutes })}
              {" · "}
              {formatToCurrency(
                booking.currency as Parameters<typeof formatToCurrency>[0],
                booking.grossAmount,
              )}
            </p>
          </div>
        </div>
        <PendingPaymentActions
          expiresAt={booking.expiresAt}
          paymentUrl={booking.paymentUrl}
          nowMs={nowMs}
        />
      </CardContent>
    </Card>
  );
}

function PendingPlanCard({
  enrollment,
  nowMs,
}: {
  enrollment: PendingPlanItem;
  nowMs: number;
}) {
  const t = useTranslations("Dashboard.pendingBookings");

  return (
    <Card className="overflow-hidden border-violet-100">
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <Image
            src={enrollment.tutorAvatarUrl || "/images/default-avatar.png"}
            alt={enrollment.tutorName}
            width={48}
            height={48}
            className="size-12 shrink-0 rounded-xl object-cover"
          />
          <div className="min-w-0 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-violet-500">
              {t("planBadge")}
            </p>
            <p className="font-semibold text-slate-900">
              {t("planWith", { tutor: enrollment.tutorName })}
            </p>
            <p className="text-sm text-slate-600">
              {t("lessonsPerWeek", { n: enrollment.lessonsPerWeek })}
            </p>
            <p className="text-xs text-slate-500">
              {formatToCurrency(
                enrollment.currency as Parameters<typeof formatToCurrency>[0],
                enrollment.grossAmount,
              )}
            </p>
          </div>
        </div>
        <PendingPaymentActions
          expiresAt={enrollment.expiresAt}
          paymentUrl={enrollment.paymentUrl}
          nowMs={nowMs}
        />
      </CardContent>
    </Card>
  );
}

export default function PendingBookingsPage() {
  const t = useTranslations("Dashboard.pendingBookings");
  const {
    data: trialData,
    isPending: isTrialPending,
    isError: isTrialError,
    refetch: refetchTrial,
  } = useGetStudentPendingPaymentBookings();
  const {
    data: planData,
    isPending: isPlanPending,
    isError: isPlanError,
    refetch: refetchPlan,
  } = useGetStudentPendingPaymentEnrollments();
  const [nowMs, setNowMs] = useState(() => Date.now());

  const isPending = isTrialPending || isPlanPending;
  const isError = isTrialError || isPlanError;

  const refetch = () => {
    void refetchTrial();
    void refetchPlan();
  };

  useEffect(() => {
    const id = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const trialItems = trialData?.items ?? [];
    const planItems = planData?.items ?? [];
    const hasExpired = [...trialItems, ...planItems].some(
      (item) => new Date(item.expiresAt).getTime() <= nowMs,
    );
    if (hasExpired) {
      refetch();
    }
  }, [trialData?.items, planData?.items, nowMs]);

  const activeItems = useMemo((): PendingItem[] => {
    const trials: PendingTrialItem[] = (trialData?.items ?? [])
      .filter((item) => new Date(item.expiresAt).getTime() > nowMs)
      .map((item) => ({ ...item, kind: "trial" as const }));
    const plans: PendingPlanItem[] = (planData?.items ?? [])
      .filter((item) => new Date(item.expiresAt).getTime() > nowMs)
      .map((item) => ({ ...item, kind: "plan" as const }));
    return [...trials, ...plans].sort(
      (a, b) =>
        new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime(),
    );
  }, [trialData?.items, planData?.items, nowMs]);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <header className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-wider text-violet-600">
          {t("eyebrow")}
        </p>
        <h1 className="text-2xl font-extrabold text-slate-900">{t("title")}</h1>
        <p className="text-sm text-slate-600">{t("subtitle")}</p>
      </header>

      {isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="p-6 text-sm text-destructive">
            {t("loadError")}
          </CardContent>
        </Card>
      ) : activeItems.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="space-y-2 p-8 text-center">
            <p className="text-lg font-semibold text-slate-900">
              {t("empty.title")}
            </p>
            <p className="text-sm text-slate-600">{t("empty.description")}</p>
            <Button variant="outline" className="mt-4">
              <Link href={ROUTES.TUTOR.INDEX}>{t("empty.browseTutors")}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {activeItems.map((item) =>
            item.kind === "trial" ? (
              <PendingTrialCard key={`trial-${item.id}`} booking={item} nowMs={nowMs} />
            ) : (
              <PendingPlanCard
                key={`plan-${item.id}`}
                enrollment={item}
                nowMs={nowMs}
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}
