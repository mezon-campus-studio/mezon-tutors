"use client";

import {
  calculateGroupSubscriptionPrice,
  ECurrency,
  formatToCurrency,
  ROUTES,
  type TutorSubscriptionPlanDto,
} from "@mezon-tutors/shared";
import { useAtomValue } from "jotai";
import { AlertCircle, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
} from "@/components/ui";
import { buttonVariants } from "@/components/ui/button";
import { useCurrency, useUserTimezone } from "@/hooks";
import { cn } from "@/lib/utils";
import {
  useGetStudyGroup,
  useGetSubscriptionEligibility,
  useGetSubscriptionPlansByTutor,
  useGetVerifiedTutorAbout,
  usePublicAppSettings,
} from "@/services";
import { isAuthenticatedAtom, userAtom } from "@/store/auth.atom";

function getPlanPrice(
  plan: TutorSubscriptionPlanDto,
  currency: ECurrency,
): number {
  return currency === ECurrency.USD
    ? plan.price.usd
    : currency === ECurrency.PHP
      ? plan.price.php
      : plan.price.vnd;
}

export default function SubscriptionPlanCheckoutPage() {
  const t = useTranslations("SubscriptionCheckout.PlanPicker");
  const searchParams = useSearchParams();
  const router = useRouter();
  const tutorId = searchParams.get("tutorId") ?? "";
  const groupId = searchParams.get("groupId") ?? undefined;
  const isAuth = useAtomValue(isAuthenticatedAtom);
  const currentUser = useAtomValue(userAtom);
  const { currency } = useCurrency();
  const userTimezone = useUserTimezone();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const { data: tutor, isPending: isTutorPending } =
    useGetVerifiedTutorAbout(tutorId);
  const { data: plans, isPending: isPlansPending } =
    useGetSubscriptionPlansByTutor(tutorId, Boolean(tutorId));
  const { data: eligibility, isPending: isEligPending } =
    useGetSubscriptionEligibility(tutorId, Boolean(tutorId) && isAuth);
  const { data: group, isPending: isGroupPending } = useGetStudyGroup(
    groupId ?? "",
    Boolean(groupId) && isAuth,
  );
  const { data: appSettings, isPending: isAppSettingsPending } =
    usePublicAppSettings();

  const groupMemberCount = group?.members?.length ?? 1;
  const groupDiscountRate = appSettings?.subscriptionGroupDiscountRate ?? 1;
  const canApplyGroupBooking = Boolean(
    groupId &&
      group &&
      currentUser?.id &&
      group.leaderId === currentUser.id &&
      groupMemberCount >= 2,
  );
  const groupDiscountPercent = Math.round((1 - groupDiscountRate) * 100);

  const isPending =
    isTutorPending ||
    isPlansPending ||
    (isAuth && isEligPending) ||
    (Boolean(groupId) && isAuth && isGroupPending) ||
    (canApplyGroupBooking && isAppSettingsPending);
  const canSubscribe = Boolean(isAuth && eligibility?.eligible);
  const selectedPlan = useMemo(
    () => plans?.find((p) => p.id === selectedPlanId) ?? null,
    [plans, selectedPlanId],
  );

  useEffect(() => {
    if (!plans?.length) {
      setSelectedPlanId(null);
      return;
    }
    setSelectedPlanId((prev) => {
      if (prev && plans.some((p) => p.id === prev)) {
        return prev;
      }
      return plans[0]?.id ?? null;
    });
  }, [plans]);

  const monthlyLabel = (p: TutorSubscriptionPlanDto) =>
    formatToCurrency(currency, getPlanPrice(p, currency));

  const getGroupPlanPricing = (p: TutorSubscriptionPlanDto) => {
    const baseMonthlyPrice = getPlanPrice(p, currency);
    const pricing = calculateGroupSubscriptionPrice({
      baseMonthlyPrice,
      memberCount: groupMemberCount,
      groupDiscountRate,
      platformFeeRate: 0,
    });
    const fullGroupPrice = baseMonthlyPrice * groupMemberCount;
    const savings = fullGroupPrice - pricing.grossAmount;
    return {
      perStudentDisplay: formatToCurrency(currency, baseMonthlyPrice),
      groupTotalDisplay: formatToCurrency(currency, pricing.grossAmount),
      savingsDisplay: formatToCurrency(currency, savings),
    };
  };

  const handleContinue = () => {
    if (!tutorId || !selectedPlanId) {
      return;
    }
    const groupId = searchParams.get("groupId");
    const query = new URLSearchParams({
      tutorId,
      lessonsPerWeek: selectedPlanId,
      timezone: userTimezone,
    });
    if (groupId) {
      query.set("groupId", groupId);
    }
    router.push(`${ROUTES.CHECKOUT.SUBSCRIPTION_PLAN_SCHEDULE}?${query.toString()}`);
  };

  if (!tutorId) {
    return (
      <div className="relative min-h-screen overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,#faf7ff_0%,#ffffff_70%)]" />
        </div>
        <div className="mx-auto max-w-2xl px-5 py-20">
          <Card className="border-rose-200 text-center">
            <CardHeader>
              <AlertCircle className="mx-auto size-8 text-rose-500" />
              <CardTitle className="text-xl">{t("missingTutor")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Link
                className={buttonVariants({ variant: "outline" })}
                href={ROUTES.TUTOR.INDEX}
              >
                {t("backTutors")}
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen text-slate-900">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#faf7ff_0%,#ffffff_70%)]" />
        <div className="absolute -top-40 left-1/2 size-[44rem] -translate-x-1/2 rounded-full bg-violet-300/30 blur-[140px]" />
      </div>

      <div className="mx-auto w-full max-w-3xl px-4 py-10 pb-[calc(10.5rem+env(safe-area-inset-bottom,0))] sm:px-6">
        <div className="mb-8 space-y-2 text-center sm:text-left">
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-violet-600">
            <Sparkles className="size-3.5" />
            {t("eyebrow")}
          </p>
          <h1 className="text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
            {t("title")}
          </h1>
          <p className="text-sm text-slate-600 sm:text-base">{t("subtitle")}</p>
          {tutor ? (
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-800">
                {tutor.firstName} {tutor.lastName}
              </p>
              <p className="text-xs text-slate-500">
                Times shown in tutor timezone ({tutor.timezone || "UTC"})
              </p>
            </div>
          ) : null}
        </div>

        {!isAuth ? (
          <Card className="border-amber-200 bg-amber-50/60">
            <CardHeader>
              <CardTitle className="text-base">{t("loginTitle")}</CardTitle>
              <CardDescription>{t("loginDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link className={buttonVariants()} href={ROUTES.HOME.index}>
                {t("loginCta")}
              </Link>
            </CardContent>
          </Card>
        ) : null}

        {isAuth && !isPending && !canSubscribe ? (
          <Card className="border-rose-200 bg-rose-50/50">
            <CardHeader>
              <CardTitle className="text-base">
                {t("notEligibleTitle")}
              </CardTitle>
              <CardDescription>
                {eligibility?.reason === "TRIAL_NOT_COMPLETED"
                  ? t("notEligibleTrial")
                  : eligibility?.reason === "NO_TRIAL_PRICE"
                    ? t("notEligibleNoTrialPrice")
                    : eligibility?.reason === "ALREADY_ENROLLED"
                      ? t("notEligibleEnrolled")
                      : t("notEligibleGeneric")}
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        {isPending ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        ) : (
          <div className="space-y-3">
            {canApplyGroupBooking && group ? (
              <div className="sticky top-0 z-10 mb-3 rounded-2xl border border-violet-200/80 bg-violet-50/95 p-5 shadow-sm backdrop-blur-sm">
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                    <Users className="size-3.5" />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-sm font-semibold text-slate-800">
                      {t("groupBanner.label")}{" "}
                      <span className="text-violet-700">{group.name}</span>
                    </p>
                    <p className="text-xs font-medium text-violet-600">
                      {t("groupBanner.membersDiscount", {
                        count: groupMemberCount,
                        percent: groupDiscountPercent,
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {(plans ?? []).map((p) => {
              const active = p.id === selectedPlanId;
              const groupPricing = canApplyGroupBooking
                ? getGroupPlanPricing(p)
                : null;

              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={!canSubscribe}
                  className={cn(
                    "flex w-full flex-col cursor-pointer gap-1 rounded-2xl border bg-card p-5 text-left text-card-foreground ring-1 ring-foreground/10 transition-all outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2",
                    active
                      ? "border-violet-400 bg-violet-50 ring-2 ring-violet-200"
                      : "border-slate-200 hover:border-violet-200",
                    !canSubscribe && "cursor-not-allowed opacity-60",
                  )}
                  onClick={() => setSelectedPlanId(p.id)}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <span className="text-lg font-extrabold text-slate-900">
                        {t("lessonsPerWeek", { n: p.lessonsPerWeek })}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {t("perMonth")}
                      </span>
                    </div>

                    {groupPricing ? (
                      <div className="text-right">
                        <p className="text-xs text-slate-500">
                          {t("groupPricing.perStudent", {
                            price: groupPricing.perStudentDisplay,
                          })}
                        </p>
                        <p className="text-xl font-extrabold text-violet-700">
                          {groupPricing.groupTotalDisplay}
                        </p>
                        <p className="text-xs font-medium text-emerald-600">
                          {t("groupPricing.savings", {
                            amount: groupPricing.savingsDisplay,
                          })}
                        </p>
                      </div>
                    ) : (
                      <span className="text-xl font-extrabold text-violet-700">
                        {monthlyLabel(p)}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
            {!plans?.length ? (
              <p className="text-center text-sm text-slate-600">
                {t("emptyPlans")}
              </p>
            ) : null}
          </div>
        )}
      </div>

      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 border-t border-violet-100/80 bg-linear-to-t from-violet-50/95 via-white/95 to-white/95 shadow-[0_-12px_40px_-16px_rgba(124,58,237,0.2)] backdrop-blur-md",
          "pb-[max(0.75rem,env(safe-area-inset-bottom,0))] pt-6",
        )}
      >
        <div className="mx-auto py-2 flex w-full max-w-3xl flex-row flex-wrap items-center justify-end gap-3 px-6 sm:pl-10 sm:pr-8">
          <Link
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-11 shrink-0 px-6",
            )}
            href={tutorId ? ROUTES.TUTOR.DETAIL(tutorId) : ROUTES.TUTOR.INDEX}
          >
            {t("back")}
          </Link>
          <Button
            className="h-11 shrink-0 bg-brand-gradient px-6"
            disabled={!canSubscribe || !selectedPlan}
            onClick={handleContinue}
          >
            {t("continueSchedule", { n: selectedPlan?.lessonsPerWeek ?? 0 })}
          </Button>
        </div>
      </div>
    </div>
  );
}
