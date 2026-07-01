"use client";

import { formatToCurrency, ROUTES } from "@mezon-tutors/shared";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import {
  Clock,
  CreditCard,
  Inbox,
  Sparkles,
  Ticket,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  CardContent,
  Skeleton,
} from "@/components/ui";
import { useUserTimezone } from "@/hooks";
import { cn } from "@/lib/utils";
import { formatInstantRangeLabels } from "@/lib/timezone";
import {
  useGetStudentPendingPaymentBookings,
  useGetStudentPendingPaymentEnrollments,
  type StudentPendingPaymentBooking,
  type StudentPendingPaymentEnrollment,
} from "@/services";

dayjs.extend(duration);

function initials(name?: string) {
  if (!name?.trim()) return "T";
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "T"
  );
}

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
    <div className="flex shrink-0 flex-col items-stretch gap-2.5 sm:items-end">
      <div
        className={cn(
          "inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset",
          isExpired
            ? "bg-slate-50 text-slate-600 ring-slate-200"
            : "bg-amber-50 text-amber-800 ring-amber-200",
        )}
      >
        <Clock className="size-3.5 shrink-0" />
        {isExpired ? t("expired") : t("expiresIn", { time: countdown })}
      </div>
      <Button
        size="sm"
        variant="gradient"
        className="h-10 gap-2 rounded-full px-5 shadow-md shadow-violet-300/35"
        disabled={isExpired || !paymentUrl}
        onClick={handlePay}
      >
        <CreditCard className="size-4" />
        {t("payNow")}
      </Button>
    </div>
  );
}

function PendingItemCard({
  item,
  nowMs,
}: {
  item: PendingItem;
  nowMs: number;
}) {
  const t = useTranslations("Dashboard.pendingBookings");
  const userTimezone = useUserTimezone();
  const isTrial = item.kind === "trial";

  const tutorName = item.tutorName;
  const tutorAvatarUrl = item.tutorAvatarUrl;
  const expiresAt = item.expiresAt;
  const paymentUrl = item.paymentUrl;
  const grossAmount = item.grossAmount;
  const currency = item.currency as Parameters<typeof formatToCurrency>[0];

  const { dateLabel, timeLabel } = isTrial
    ? formatInstantRangeLabels(
        item.startAt,
        item.durationMinutes,
        userTimezone,
      )
    : { dateLabel: "", timeLabel: "" };

  return (
    <Card
      className={cn(
        "min-w-0 overflow-hidden border-l-4 shadow-sm",
        isTrial
          ? "border-l-amber-400 border-amber-100/80 bg-[linear-gradient(180deg,#ffffff_0%,#fffaf0_100%)] shadow-amber-100/30"
          : "border-l-fuchsia-400 border-fuchsia-100/80 bg-[linear-gradient(180deg,#ffffff_0%,#fdf4ff_100%)] shadow-fuchsia-100/30",
      )}
    >
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <Avatar
            className={cn(
              "size-12 shrink-0 rounded-xl border-2 border-white shadow-sm ring-2",
              isTrial ? "ring-amber-100" : "ring-fuchsia-100",
            )}
          >
            {tutorAvatarUrl ? (
              <AvatarImage
                src={tutorAvatarUrl}
                alt={tutorName}
                className="rounded-lg object-cover"
              />
            ) : null}
            <AvatarFallback
              className={cn(
                "rounded-lg text-sm font-bold text-white",
                isTrial
                  ? "bg-[linear-gradient(135deg,#f59e0b,#ea580c)]"
                  : "bg-[linear-gradient(135deg,#c026d3,#7c3aed)]",
              )}
            >
              {initials(tutorName)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 space-y-2">
            <Badge
              variant="secondary"
              className={cn(
                "h-5 px-2 py-0 text-[10px] font-bold uppercase tracking-wide",
                isTrial
                  ? "border-amber-200/60 bg-amber-100/90 text-amber-900"
                  : "border-fuchsia-200/60 bg-fuchsia-100/90 text-fuchsia-800",
              )}
            >
              {isTrial ? t("trialBadge") : t("planBadge")}
            </Badge>

            <div className="space-y-1">
              <p className="font-extrabold text-slate-900">
                {isTrial
                  ? t("lessonWith", { tutor: tutorName })
                  : t("planWith", { tutor: tutorName })}
              </p>

              {isTrial ? (
                <p className="text-sm text-slate-600">
                  {dateLabel}
                  <span className="mx-1.5 text-slate-300">·</span>
                  {timeLabel}
                </p>
              ) : (
                <p className="text-sm text-slate-600">
                  {t("lessonsPerWeek", { n: item.lessonsPerWeek })}
                </p>
              )}

              <p className="text-xs font-semibold text-slate-500">
                {isTrial
                  ? `${t("duration", { minutes: item.durationMinutes })} · `
                  : null}
                {formatToCurrency(currency, grossAmount)}
              </p>
            </div>
          </div>
        </div>

        <PendingPaymentActions
          expiresAt={expiresAt}
          paymentUrl={paymentUrl}
          nowMs={nowMs}
        />
      </CardContent>
    </Card>
  );
}

function PendingBookingsMetrics({
  trialCount,
  planCount,
  isLoading,
}: {
  trialCount: number;
  planCount: number;
  isLoading: boolean;
}) {
  const t = useTranslations("Dashboard.pendingBookings");

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>
    );
  }

  const total = trialCount + planCount;

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
      <Card className="min-w-0 border-violet-100 shadow-sm shadow-violet-100/40">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-slate-600 sm:text-sm">
                {t("title")}
              </p>
              <p className="mt-1.5 text-2xl font-extrabold text-slate-900 sm:mt-2 sm:text-3xl">
                {total}
              </p>
            </div>
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 sm:size-10">
              <CreditCard className="size-4 sm:size-5" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="min-w-0 border-amber-100 shadow-sm shadow-amber-100/30">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-slate-600 sm:text-sm">
                {t("trialBadge")}
              </p>
              <p className="mt-1.5 text-2xl font-extrabold text-slate-900 sm:mt-2 sm:text-3xl">
                {trialCount}
              </p>
            </div>
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 sm:size-10">
              <Ticket className="size-4 sm:size-5" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="col-span-2 min-w-0 border-fuchsia-100 shadow-sm shadow-fuchsia-100/30 lg:col-span-1">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-slate-600 sm:text-sm">
                {t("planBadge")}
              </p>
              <p className="mt-1.5 text-2xl font-extrabold text-slate-900 sm:mt-2 sm:text-3xl">
                {planCount}
              </p>
            </div>
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-fuchsia-100 text-fuchsia-700 sm:size-10">
              <Sparkles className="size-4 sm:size-5" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
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

  const trialCount = activeItems.filter((item) => item.kind === "trial").length;
  const planCount = activeItems.filter((item) => item.kind === "plan").length;

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden">
      <div className="mx-auto w-full max-w-[1320px] px-4 py-6 md:px-6 md:py-8 lg:px-8">
        <div className="flex flex-col gap-5 md:gap-6">
          <header className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-gradient-135 text-white shadow-md shadow-violet-300/40 sm:size-12">
              <CreditCard className="size-5 sm:size-6" />
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-500">
                {t("eyebrow")}
              </p>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">
                {t("title")}
              </h1>
              <p className="mt-1 text-sm text-slate-500">{t("subtitle")}</p>
            </div>
          </header>

          <PendingBookingsMetrics
            trialCount={trialCount}
            planCount={planCount}
            isLoading={isPending}
          />

          <Card className="min-w-0 border-violet-100 shadow-sm">
            <CardContent className="space-y-3 px-4 pb-5 pt-5 sm:space-y-4 sm:px-6 sm:pb-6 sm:pt-6">
              {isPending ? (
                <div className="space-y-3">
                  <Skeleton className="h-32 w-full rounded-2xl" />
                  <Skeleton className="h-32 w-full rounded-2xl" />
                </div>
              ) : isError ? (
                <div className="rounded-2xl border border-rose-100 bg-rose-50/60 px-4 py-8 text-center text-sm text-rose-700">
                  {t("loadError")}
                </div>
              ) : activeItems.length === 0 ? (
                <div className="flex flex-col items-center rounded-2xl border border-dashed border-violet-200 bg-[linear-gradient(180deg,#faf8ff_0%,#ffffff_100%)] px-4 py-10 text-center sm:py-12">
                  <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
                    <Inbox className="size-6" />
                  </div>
                  <p className="text-base font-semibold text-slate-800 sm:text-lg">
                    {t("empty.title")}
                  </p>
                  <p className="mt-2 max-w-md text-sm text-slate-500">
                    {t("empty.description")}
                  </p>
                  <Link href={ROUTES.TUTOR.INDEX}>
                    <Button
                      variant="gradient"
                      className="mt-5 h-10 rounded-full px-5 shadow-md shadow-violet-300/35"
                    >
                        {t("empty.browseTutors")}
                    </Button>
                  </Link>
                  
                </div>
              ) : (
                activeItems.map((item) => (
                  <PendingItemCard
                    key={`${item.kind}-${item.id}`}
                    item={item}
                    nowMs={nowMs}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
