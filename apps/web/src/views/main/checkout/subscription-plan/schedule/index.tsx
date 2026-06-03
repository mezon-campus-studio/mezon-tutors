"use client";

import {
  DEFAULT_TIMEZONE,
  ECurrency,
  formatToCurrency,
  ROUTES,
  utcWeeklySlotsToCalendarInstances,
  expandCalendarSlotToSteps,
  getWeekMondayInTimezone,
} from "@mezon-tutors/shared";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { useAtomValue } from "jotai";
import { AlertCircle, Calendar, Clock, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  PaymentMethodId,
  PaymentMethodSelection,
} from "@/components/common/PaymentMethodSelection";
import {
  ScheduleSelection,
  type SelectedScheduleSlot,
} from "@/components/common/ScheduleSelection";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
  toast,
} from "@/components/ui";
import { buttonVariants } from "@/components/ui/button";
import { useCurrency, useUserTimezone } from "@/hooks";
import {
  convertWallClockSlotBetweenTimezones,
  getWeekStartMondayInTimezone,
  normalizeTimezoneParam,
  parseYmdInTimezone,
  resolveStableTimezone,
  startOfTodayInTimezone,
} from "@/lib/timezone";
import { computeBlockedWallClockSlots } from "@/lib/schedule-slot-occupancy";
import { cn } from "@/lib/utils";
import {
  useCreateSubscriptionEnrollmentMutation,
  useGetSubscriptionEligibility,
  useGetOccupiedTrialLessonSlotsForWeek,
  useGetSubscriptionPlansByTutor,
  useGetTutorAvailability,
  useWalletDetails,
} from "@/services";
import { isAuthenticatedAtom, userAtom } from "@/store/auth.atom";
import { SubscriptionPaymentSummaryCard } from "../components/SubscriptionPaymentSummaryCard";
import { computeWalletPaymentSplit } from "../../trial-lesson/components/wallet-payment";
const SUBSCRIPTION_GRID_INTERVAL_MINUTES = 60;
const SUBSCRIPTION_LESSON_MINUTES = 60;

dayjs.extend(utc);
dayjs.extend(timezone);

function getInitialWeekBounds(timezoneName: string): {
  start: string;
  end: string;
} {
  const monday = getWeekStartMondayInTimezone(timezoneName);
  return {
    start: monday.format("YYYY-MM-DD"),
    end: monday.add(6, "day").format("YYYY-MM-DD"),
  };
}

function slotKey(s: { date: string; startTime: string }): string {
  return `${s.date}|${s.startTime}`;
}

export default function SubscriptionPlanSchedulePage() {
  const t = useTranslations("SubscriptionCheckout.SchedulePicker");
  const searchParams = useSearchParams();
  const tutorId = searchParams.get("tutorId") ?? "";
  const lessonsPerWeekRaw = searchParams.get("lessonsPerWeek") ?? "";
  const lessonsPerWeek = useMemo(() => {
    const n = Number.parseInt(lessonsPerWeekRaw, 10);
    if (!Number.isFinite(n) || n < 1 || n > 7) {
      return null;
    }
    return n;
  }, [lessonsPerWeekRaw]);
  const isAuth = useAtomValue(isAuthenticatedAtom);
  const currentUser = useAtomValue(userAtom);
  const { currency } = useCurrency();
  const fallbackTimezone = useUserTimezone();
  const timezoneFromQuery = useMemo(
    () => normalizeTimezoneParam(searchParams.get("timezone")),
    [searchParams],
  );
  const userTimezone = useMemo(
    () =>
      resolveStableTimezone(currentUser?.timezone, timezoneFromQuery) ??
      fallbackTimezone,
    [currentUser?.timezone, timezoneFromQuery, fallbackTimezone],
  );
  const [weekBounds, setWeekBounds] = useState(() =>
    getInitialWeekBounds(userTimezone),
  );
  const [selectedSlots, setSelectedSlots] = useState<SelectedScheduleSlot[]>(
    [],
  );
  const [useWalletBalance, setUseWalletBalance] = useState(false);

  const { data: plans, isPending: isPlansLoading } =
    useGetSubscriptionPlansByTutor(tutorId, Boolean(tutorId));
  const plan = useMemo(
    () => plans?.find((p) => p.lessonsPerWeek === lessonsPerWeek) ?? null,
    [plans, lessonsPerWeek],
  );

  const { data: schedule } = useGetTutorAvailability(tutorId, Boolean(tutorId));
  const { data: eligibility } = useGetSubscriptionEligibility(
    tutorId,
    Boolean(tutorId) && isAuth,
  );
  const {
    data: occupiedWeekResponse,
    isFetching: isOccupiedWeekFetching,
    isSuccess: isOccupiedWeekReady,
    isError: isOccupiedWeekError,
  } = useGetOccupiedTrialLessonSlotsForWeek(
    tutorId,
    weekBounds.start,
    userTimezone,
    Boolean(tutorId),
  );
  const occupiedWeekItems = occupiedWeekResponse?.items ?? [];

  useEffect(() => {
    setWeekBounds(getInitialWeekBounds(userTimezone));
  }, [userTimezone]);

  const createEnrollment = useCreateSubscriptionEnrollmentMutation();
  const { data: walletDetails } = useWalletDetails();

  const planPrice = useMemo(() => {
    if (!plan) {
      return 0;
    }
    if (currency === ECurrency.USD) {
      return plan.price.usd;
    }
    if (currency === ECurrency.PHP) {
      return plan.price.php;
    }
    return plan.price.vnd;
  }, [plan, currency]);

  const totalDisplay = plan ? formatToCurrency(currency, planPrice) : undefined;

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
        planPrice,
        walletBalance,
        useWalletBalance && showWalletRow,
      ),
    [planPrice, walletBalance, useWalletBalance, showWalletRow],
  );

  const payWithWalletOnly =
    showWalletRow && useWalletBalance && walletPayment.vnpayAmount === 0;
  const paymentButtonAmountDisplay = payWithWalletOnly
    ? totalDisplay
    : useWalletBalance && showWalletRow && walletPayment.vnpayAmount > 0
      ? formatToCurrency(ECurrency.VND, walletPayment.vnpayAmount)
      : totalDisplay;

  const redirectToVnpay = useCallback((url: string) => {
    if (typeof window === "undefined") {
      return;
    }
    window.location.assign(url);
  }, []);

  const scheduleAvailableSlots = useMemo(() => {
    const rows = schedule?.availability ?? [];
    if (!rows.length) {
      return [];
    }

    const today = startOfTodayInTimezone(userTimezone);
    const baseMonday = getWeekMondayInTimezone(userTimezone);
    const selectedMonday = parseYmdInTimezone(weekBounds.start, userTimezone);
    const weekOffset = selectedMonday.diff(baseMonday, "week");

    const utcSlots = rows.map((slot) => ({
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      isActive: slot.isActive,
    }));

    const instances = utcWeeklySlotsToCalendarInstances(
      utcSlots,
      userTimezone,
      weekOffset,
    );

    const candidates = instances
      .filter((instance) => !parseYmdInTimezone(instance.date, userTimezone).isBefore(today, "day"))
      .flatMap((instance) =>
        expandCalendarSlotToSteps(
          instance,
          SUBSCRIPTION_GRID_INTERVAL_MINUTES,
          SUBSCRIPTION_LESSON_MINUTES,
        ),
      );

    return candidates;
  }, [schedule?.availability, userTimezone, weekBounds.start]);

  const scheduleBlockedSlots = useMemo(() => {
    if (!isOccupiedWeekReady && !isOccupiedWeekError) {
      return [];
    }
    return computeBlockedWallClockSlots(
      scheduleAvailableSlots,
      SUBSCRIPTION_LESSON_MINUTES,
      userTimezone,
      { occupied: occupiedWeekItems },
    );
  }, [
    scheduleAvailableSlots,
    userTimezone,
    occupiedWeekItems,
    isOccupiedWeekReady,
    isOccupiedWeekError,
  ]);

  const scheduleSelectableSlots = useMemo(() => {
    const blockedKeys = new Set(scheduleBlockedSlots.map((s) => slotKey(s)));
    return scheduleAvailableSlots.filter((s) => !blockedKeys.has(slotKey(s)));
  }, [scheduleAvailableSlots, scheduleBlockedSlots]);

  const handleWeekChange = useCallback(
    (payload: { weekOffset: number; startDate: string; endDate: string }) => {
      setWeekBounds({ start: payload.startDate, end: payload.endDate });
    },
    [],
  );

  useEffect(() => {
    if (tutorId && lessonsPerWeek && weekBounds.start) {
      setSelectedSlots([]);
    }
  }, [lessonsPerWeek, tutorId, weekBounds.start]);

  useEffect(() => {
    setSelectedSlots((prev) =>
      prev.filter((selected) =>
        scheduleSelectableSlots.some(
          (slot) =>
            slot.date === selected.date && slot.startTime === selected.startTime,
        ),
      ),
    );
  }, [scheduleSelectableSlots]);

  const canSubmit = Boolean(
    isAuth &&
      eligibility?.eligible &&
      plan &&
      selectedSlots.length === lessonsPerWeek,
  );

  const submitEnrollment = useCallback(async () => {
    if (!canSubmit || !plan) {
      return;
    }
    const enrollment = await createEnrollment.mutateAsync({
      tutorId,
      lessonsPerWeek: plan.lessonsPerWeek,
      currency,
      slots: selectedSlots.map((s) =>
        convertWallClockSlotBetweenTimezones(
          s.date,
          s.startTime,
          s.endTime,
          userTimezone,
          DEFAULT_TIMEZONE,
        ),
      ),
    });
    if (enrollment.paymentUrl) {
      redirectToVnpay(enrollment.paymentUrl);
    }
    return enrollment;
  }, [
    canSubmit,
    createEnrollment,
    currency,
    plan,
    redirectToVnpay,
    selectedSlots,
    tutorId,
    userTimezone,
  ]);

  const handleWalletPay = useCallback(async () => {
    toast.info(t("walletPaymentComingSoonTitle"), {
      description: t("walletPaymentComingSoonDescription"),
    });
  }, [t]);

  const handlePay = useCallback(
    async (_methodId: PaymentMethodId) => {
      try {
        await submitEnrollment();
      } catch (e) {
        const msg = e instanceof Error ? e.message : t("toastErrorFallback");
        toast.error(t("toastErrorTitle"), { description: msg });
      }
    },
    [submitEnrollment, t],
  );

  const removeSlot = (key: string) => {
    setSelectedSlots((prev) => prev.filter((s) => slotKey(s) !== key));
  };

  if (!tutorId || lessonsPerWeek === null) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <Card className="text-center">
          <CardHeader>
            <AlertCircle className="mx-auto size-8 text-rose-500" />
            <CardTitle className="text-base">{t("missingParams")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              className={cn(
                buttonVariants({ variant: "outline" }),
                "inline-flex",
              )}
              href={ROUTES.TUTOR.INDEX}
            >
              {t("backTutors")}
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isPlansLoading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-16">
        <Skeleton className="h-10 w-full max-w-md rounded-lg" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (!plans?.length) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <Card className="text-center">
          <CardHeader>
            <CardTitle className="text-base">{t("noPlansForTutor")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              className={cn(
                buttonVariants({ variant: "outline" }),
                "inline-flex",
              )}
              href={ROUTES.TUTOR.INDEX}
            >
              {t("backTutors")}
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <Card className="text-center">
          <CardHeader>
            <CardTitle className="text-base">{t("invalidPlan")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              className={cn(
                buttonVariants({ variant: "outline" }),
                "inline-flex",
              )}
              href={`${ROUTES.CHECKOUT.SUBSCRIPTION_PLAN}?tutorId=${encodeURIComponent(tutorId)}`}
            >
              {t("backPlans")}
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen text-slate-900">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#faf7ff_0%,#ffffff_70%)]" />
      </div>

      <div className="mx-auto max-w-3/4 px-4 py-8 sm:px-6">
        <div className="mb-6 space-y-1">
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            {t("title")}
          </h1>
          <p className="text-sm text-slate-600">
            {t("pickCount", { n: lessonsPerWeek })}
          </p>
        </div>

        {!isAuth || !eligibility?.eligible ? (
          <Card className="mb-6 border-amber-200">
            <CardHeader>
              <CardTitle className="text-base">{t("lockedTitle")}</CardTitle>
              <CardDescription>{t("lockedDescription")}</CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            <div className="flex min-h-[min(70vh,720px)] flex-col">
              <ScheduleSelection
                availableSlots={scheduleAvailableSlots}
                blockedSlots={scheduleBlockedSlots}
                timezone={userTimezone}
                selectionMode="multiple"
                maxSelections={lessonsPerWeek}
                value={selectedSlots}
                onChange={setSelectedSlots}
                onWeekChange={handleWeekChange}
                fillAvailableHeight
                className="min-h-0 flex-1"
                gridIntervalMinutes={SUBSCRIPTION_GRID_INTERVAL_MINUTES}
                lessonDurationMinutes={SUBSCRIPTION_LESSON_MINUTES}
              />
            </div>

            {plan && totalDisplay ? (
              <div className="flex flex-col items-stretch gap-5 lg:flex-row">
                <div className="w-full flex-1 lg:basis-2/3">
                  <SubscriptionPaymentSummaryCard
                    lessonsPerWeek={plan.lessonsPerWeek}
                    totalDisplay={totalDisplay}
                    lessonPrice={planPrice}
                    walletBalance={walletBalance}
                    showWalletRow={showWalletRow}
                    useWalletBalance={useWalletBalance}
                    onUseWalletBalanceChange={setUseWalletBalance}
                    deductFromWallet={walletPayment.deductFromWallet}
                    vnpayAmount={walletPayment.vnpayAmount}
                  />
                </div>
                <div className="w-full lg:sticky lg:top-24 lg:max-w-[460px] lg:basis-1/3">
                  <PaymentMethodSelection
                    totalDisplay={paymentButtonAmountDisplay}
                    onPayAction={handlePay}
                    onWalletPayAction={handleWalletPay}
                    payWithWalletOnly={payWithWalletOnly}
                    payDisabled={!canSubmit}
                    isPayLoading={createEnrollment.isPending}
                    bookAndPayLabel={
                      paymentButtonAmountDisplay
                        ? t("submitAndPay", {
                            amount: paymentButtonAmountDisplay,
                          })
                        : t("submit")
                    }
                    walletPayLabel={
                      totalDisplay
                        ? t("submitWithWallet", { amount: totalDisplay })
                        : t("submit")
                    }
                  />
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex w-full shrink-0 flex-col gap-4 lg:sticky lg:top-24 lg:max-w-[360px] lg:basis-[360px]">
            <Card className="flex flex-col overflow-hidden rounded-2xl border-violet-200/70 bg-card/95 shadow-md shadow-violet-200/20 ring-1 ring-violet-500/10 backdrop-blur-sm">
              <CardHeader className="border-b border-violet-100/80 bg-linear-to-br from-violet-50/80 to-fuchsia-50/40 pb-3">
                <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-violet-100">
                  <div
                    className="h-full rounded-full bg-linear-to-r from-violet-600 to-fuchsia-500 transition-all duration-300"
                    style={{
                      width: `${lessonsPerWeek ? Math.min(100, (selectedSlots.length / lessonsPerWeek) * 100) : 0}%`,
                    }}
                  />
                </div>
                <CardTitle className="text-base font-semibold text-slate-900">
                  {t("selectedTitle", {
                    count: selectedSlots.length,
                    total: lessonsPerWeek,
                  })}
                </CardTitle>
                <CardDescription className="text-xs leading-relaxed text-slate-600">
                  {t("selectedHint")}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex max-h-[min(28vh,16rem)] flex-col gap-3 overflow-y-auto overscroll-contain bg-linear-to-b from-transparent to-violet-50/30 px-4 py-4 [scrollbar-width:thin]">
                {selectedSlots.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-violet-200/70 bg-violet-50/40 px-4 py-10 text-center">
                    <div className="flex size-14 items-center justify-center rounded-2xl bg-white shadow-inner ring-1 ring-violet-100">
                      <Calendar className="size-7 text-violet-400" />
                    </div>
                    <p className="max-w-56 text-sm leading-relaxed text-muted-foreground">
                      {t("selectedEmpty")}
                    </p>
                  </div>
                ) : (
                  <ul className="flex flex-col gap-2.5">
                    {selectedSlots.map((s, index) => {
                      const parts = s.label.split(" . ");
                      const datePart = parts[0]?.trim() ?? "";
                      const timePart =
                        parts.slice(1).join(" . ").trim() || s.label;
                      return (
                        <li
                          key={slotKey(s)}
                          className="group relative overflow-hidden rounded-xl border border-violet-200/60 bg-white/90 p-3 shadow-sm ring-1 ring-violet-100/40 transition-all hover:border-violet-300/80 hover:shadow-md"
                        >
                          <div className="pointer-events-none absolute inset-y-0 left-0 w-1 rounded-l-xl bg-linear-to-b from-violet-500 to-fuchsia-500" />
                          <div className="flex h-full items-center gap-3 px-3 py-0 pl-[calc(0.75rem+1px)]">
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-violet-600 to-fuchsia-600 text-xs font-bold tabular-nums text-white shadow-sm">
                              {index + 1}
                            </span>
                            <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center gap-0.5">
                              {datePart ? (
                                <p className="truncate text-[0.65rem] font-semibold uppercase tracking-wider text-violet-600">
                                  {datePart}
                                </p>
                              ) : null}
                              <p className="flex min-h-0 min-w-0 items-center gap-1.5 text-sm font-semibold tracking-tight text-slate-900">
                                <Clock className="size-3.5 shrink-0 text-fuchsia-500" />
                                <span className="min-w-0 truncate">
                                  {timePart}
                                </span>
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-9 shrink-0 rounded-full text-slate-400 opacity-80 transition-all hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100"
                              onClick={() => removeSlot(slotKey(s))}
                              aria-label={t("removeSlot")}
                            >
                              <X className="size-4" />
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Link
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-11 w-full",
              )}
              href={`${ROUTES.CHECKOUT.SUBSCRIPTION_PLAN}?tutorId=${encodeURIComponent(tutorId)}`}
            >
              {t("back")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
