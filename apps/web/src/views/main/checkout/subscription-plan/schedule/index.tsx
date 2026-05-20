"use client";

import {
  buildTimeSlotsForDay,
  jsDayToDbDayOfWeek,
  minutesToTime,
  ROUTES,
  timeToMinutes,
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
  ScheduleSelection,
  type SelectedScheduleSlot,
} from "@/components/common/ScheduleSelection";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Skeleton,
  toast,
} from "@/components/ui";
import { buttonVariants } from "@/components/ui/button";
import { useCurrency } from "@/hooks";
import { cn } from "@/lib/utils";
import {
  useCreateSubscriptionEnrollmentMutation,
  useGetSubscriptionEligibility,
  useGetSubscriptionPlansByTutor,
  useGetTutorAvailability,
} from "@/services";
import { isAuthenticatedAtom } from "@/store/auth.atom";

const SUBSCRIPTION_GRID_INTERVAL_MINUTES = 60;
const SUBSCRIPTION_LESSON_MINUTES = 60;

dayjs.extend(utc);
dayjs.extend(timezone);

function getInitialWeekBounds(timezoneName: string): {
  start: string;
  end: string;
} {
  const now = dayjs().tz(timezoneName);
  const mondayOffset = now.day() === 0 ? 6 : now.day() - 1;
  const monday = now.subtract(mondayOffset, "day").startOf("day");
  return {
    start: monday.format("YYYY-MM-DD"),
    end: monday.add(6, "day").format("YYYY-MM-DD"),
  };
}

function eachYmdInRange(startYmd: string, endYmd: string): string[] {
  const out: string[] = [];
  let cur = dayjs(startYmd, "YYYY-MM-DD");
  const end = dayjs(endYmd, "YYYY-MM-DD");
  while (cur.valueOf() <= end.valueOf()) {
    out.push(cur.format("YYYY-MM-DD"));
    cur = cur.add(1, "day");
  }
  return out;
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
  const { currency } = useCurrency();
  const [weekBounds, setWeekBounds] = useState(() =>
    getInitialWeekBounds("UTC"),
  );
  const [selectedSlots, setSelectedSlots] = useState<SelectedScheduleSlot[]>(
    [],
  );

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
  const scheduleTimezone = schedule?.timezone ?? "UTC";

  useEffect(() => {
    setWeekBounds(getInitialWeekBounds(scheduleTimezone));
  }, [scheduleTimezone]);

  const createEnrollment = useCreateSubscriptionEnrollmentMutation();

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
    const today = dayjs().tz(scheduleTimezone).startOf("day");
    return eachYmdInRange(weekBounds.start, weekBounds.end).flatMap(
      (dateString) => {
        const fullDate = dayjs.tz(`${dateString} 00:00`, scheduleTimezone);
        if (!fullDate.isValid() || fullDate.valueOf() < today.valueOf()) {
          return [];
        }
        const dayOfWeek = jsDayToDbDayOfWeek(fullDate.day());
        const daySlots = buildTimeSlotsForDay(
          rows,
          dayOfWeek,
          SUBSCRIPTION_GRID_INTERVAL_MINUTES,
          SUBSCRIPTION_LESSON_MINUTES,
        );
        return daySlots.map((slot) => {
          const endTime = minutesToTime(
            timeToMinutes(slot.startTime) + SUBSCRIPTION_LESSON_MINUTES,
          );
          return {
            date: dateString,
            startTime: slot.startTime,
            endTime,
          };
        });
      },
    );
  }, [
    schedule?.availability,
    scheduleTimezone,
    weekBounds.end,
    weekBounds.start,
  ]);

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

  const canSubmit = Boolean(
    isAuth &&
      eligibility?.eligible &&
      plan &&
      selectedSlots.length === lessonsPerWeek,
  );

  const handleSubmit = async () => {
    if (!canSubmit || !plan) {
      return;
    }
    try {
      const enrollment = await createEnrollment.mutateAsync({
        tutorId,
        lessonsPerWeek: plan.lessonsPerWeek,
        currency,
        slots: selectedSlots.map((s) => ({
          date: s.date,
          startTime: s.startTime,
          endTime: s.endTime,
        })),
      });
      if (enrollment.paymentUrl) {
        redirectToVnpay(enrollment.paymentUrl);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("toastErrorFallback");
      toast.error(t("toastErrorTitle"), { description: msg });
    }
  };

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

        <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch lg:gap-8">
          <div className="flex min-h-[min(70vh,720px)] min-w-0 flex-1 flex-col">
            <ScheduleSelection
              availableSlots={scheduleAvailableSlots}
              timezone={scheduleTimezone}
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

          <Card className="flex w-full shrink-0 flex-col overflow-hidden rounded-2xl border-violet-200/70 bg-card/95 shadow-md shadow-violet-200/20 ring-1 ring-violet-500/10 backdrop-blur-sm lg:w-96">
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
            <CardContent className="flex min-h-48 flex-1 flex-col gap-3 bg-linear-to-b from-transparent to-violet-50/30 px-4 pt-4">
              {selectedSlots.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-violet-200/70 bg-violet-50/40 px-4 py-12 text-center">
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-white shadow-inner ring-1 ring-violet-100">
                    <Calendar className="size-7 text-violet-400" />
                  </div>
                  <p className="max-w-56 text-sm leading-relaxed text-muted-foreground">
                    {t("selectedEmpty")}
                  </p>
                </div>
              ) : (
                <ul className="flex max-h-[min(40vh,22rem)] flex-col gap-2.5 overflow-y-auto overscroll-contain pr-0.5 [scrollbar-width:thin]">
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
            <CardFooter className="mt-auto shrink-0 flex flex-col gap-2 border-t border-violet-100/80 bg-linear-to-t from-violet-50/40 to-transparent">
              <Button
                className="w-full h-11 bg-[linear-gradient(110deg,#7c3aed_0%,#9333ea_50%,#db2777_100%)]"
                disabled={!canSubmit || createEnrollment.isPending}
                onClick={() => void handleSubmit()}
              >
                {t("submit")}
              </Button>
              <Link
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "w-full h-11",
                )}
                href={`${ROUTES.CHECKOUT.SUBSCRIPTION_PLAN}?tutorId=${encodeURIComponent(tutorId)}`}
              >
                {t("back")}
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
