"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAtomValue } from "jotai";
import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  toast,
} from "@/components/ui";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useGetMyProfile,
  useGetMySubscriptionPlans,
  useReplaceMySubscriptionPlansMutation,
} from "@/services";
import { userAtom } from "@/store/auth.atom";
import { ECurrency, ROUTES, type ReplaceTutorSubscriptionPlanItemDto, type TutorSubscriptionPlanDto } from "@mezon-tutors/shared";

type RowState = ReplaceTutorSubscriptionPlanItemDto;

function monthlyPriceInBase(plan: TutorSubscriptionPlanDto, base: ECurrency): number {
  if (base === ECurrency.USD) {
    return plan.price.usd;
  }
  if (base === ECurrency.PHP) {
    return plan.price.php;
  }
  return plan.price.vnd;
}

function emptyRow(): RowState {
  return {
    lessonsPerWeek: 2,
    monthlyPrice: 0,
  };
}

export default function TutorSubscriptionPlansPage() {
  const t = useTranslations("SubscriptionCheckout.TutorPlansEditor");
  const user = useAtomValue(userAtom);
  const tutorEnabled = Boolean(user?.id) && user?.role === "TUTOR";
  const { data: myProfile, isPending: isProfilePending } = useGetMyProfile({
    enabled: tutorEnabled,
  });
  const { data: plans, isPending: isPlansPending, refetch } = useGetMySubscriptionPlans(tutorEnabled);
  const replace = useReplaceMySubscriptionPlansMutation();
  const [rows, setRows] = useState<RowState[]>([]);

  const baseCurrency = (myProfile?.profile?.trialLessonPrice?.baseCurrency as ECurrency | undefined) ?? null;
  const hasPriceProfile = Boolean(myProfile?.hasProfile && baseCurrency);

  useEffect(() => {
    if (!plans || !baseCurrency) {
      return;
    }
    setRows(
      plans.map((p) => ({
        id: p.id,
        lessonsPerWeek: p.lessonsPerWeek,
        monthlyPrice: monthlyPriceInBase(p, baseCurrency),
      })),
    );
  }, [plans, baseCurrency]);

  const updateRow = useCallback((index: number, patch: Partial<RowState>) => {
    setRows((prev) => {
      const next = [...prev];
      const cur = next[index];
      if (!cur) {
        return prev;
      }
      next[index] = { ...cur, ...patch };
      return next;
    });
  }, []);

  const removeRow = useCallback((index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSave = async () => {
    try {
      await replace.mutateAsync({ plans: rows });
      toast.success(t("toastSaved"));
      void refetch();
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("toastError");
      toast.error(t("toastErrorTitle"), { description: msg });
    }
  };

  const isPending = isProfilePending || isPlansPending;

  if (user?.role !== "TUTOR") {
    return (
      <div className="mx-auto max-w-lg px-4 py-8 sm:px-6">
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-base">{t("notTutor")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Link className={cn(buttonVariants({ variant: "outline" }), "inline-flex")} href={ROUTES.DASHBOARD.INDEX}>
              {t("backDashboard")}
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isProfilePending && myProfile?.hasProfile && !baseCurrency) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8 sm:px-6">
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-base">{t("needTrialPriceTitle")}</CardTitle>
            <p className="text-sm text-muted-foreground">{t("needTrialPriceDescription")}</p>
          </CardHeader>
          <CardContent>
            <Link className={cn(buttonVariants({ size: "sm" }))} href={ROUTES.BECOME_TUTOR.INDEX}>
              {t("needTrialPriceCta")}
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="pointer-events-none absolute inset-x-0 -top-24 -z-10 mx-auto h-48 max-w-lg rounded-full bg-violet-400/15 blur-3xl" />

      {isPending ? (
        <Card size="sm" className="overflow-hidden">
          <CardHeader className="border-b border-border/60 pb-3">
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            <Skeleton className="h-18 w-full rounded-lg" />
            <Skeleton className="h-18 w-full rounded-lg" />
          </CardContent>
          <CardFooter className="border-t border-border/60">
            <Skeleton className="h-9 w-24" />
          </CardFooter>
        </Card>
      ) : (
        <Card size="sm" className="overflow-hidden shadow-sm ring-violet-500/10">
          <CardHeader className="border-b border-border/60 pb-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <CardTitle className="min-w-0 text-lg font-semibold tracking-tight sm:text-xl">{t("title")}</CardTitle>
              {baseCurrency ? (
                <Badge variant="secondary" className="shrink-0 font-mono text-[0.65rem] uppercase">
                  {baseCurrency}
                </Badge>
              ) : null}
            </div>
            {baseCurrency ? (
              <p className="text-[0.7rem] font-medium text-violet-700 sm:text-xs">{t("baseCurrencyHint", { currency: baseCurrency })}</p>
            ) : null}
          </CardHeader>

          <CardContent className="space-y-2 pt-3">
            {rows.length === 0 ? (
              <p className="rounded-lg border border-dashed border-muted-foreground/25 bg-muted/20 px-3 py-6 text-center text-sm text-muted-foreground">
                {t("noPlansYet")}
              </p>
            ) : (
              rows.map((row, index) => (
                <div
                  key={row.id ?? `new-${index}`}
                  title={t("planLabel", { index: index + 1 })}
                  className="flex flex-col gap-3 rounded-lg border border-border/60 bg-muted/15 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className="tabular-nums">
                      {index + 1}
                    </Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0 text-rose-600 hover:bg-rose-500/10 hover:text-rose-700"
                      onClick={() => removeRow(index)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>

                  <div className="grid min-w-0 gap-3 sm:grid-cols-2 sm:gap-3">
                    <div className="min-w-0 space-y-1">
                      <Label htmlFor={`lessons-${index}`} className="text-xs text-muted-foreground">
                        {t("lessonsPerWeek")}
                      </Label>
                      <Select
                        value={String(row.lessonsPerWeek)}
                        onValueChange={(v) =>
                          updateRow(index, {
                            lessonsPerWeek: Number.parseInt(v ?? "1", 10) || 1,
                          })
                        }
                      >
                        <SelectTrigger id={`lessons-${index}`} className="h-9 w-full rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                            <SelectItem key={n} value={String(n)}>
                              {t("lessonsWeekOption", { n })}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="min-w-0 space-y-1">
                      <Label htmlFor={`price-${index}`} className="text-xs text-muted-foreground">
                        {t("monthlyPriceInBase", { currency: baseCurrency ?? "" })}
                      </Label>
                      <InputGroup className="h-9 min-h-9 rounded-lg">
                        <InputGroupInput
                          id={`price-${index}`}
                          type="number"
                          min={0}
                          step={baseCurrency === ECurrency.VND ? 1 : "0.01"}
                          value={row.monthlyPrice}
                          onChange={(e) =>
                            updateRow(index, {
                              monthlyPrice: Number.parseFloat(e.target.value) || 0,
                            })
                          }
                        />
                        {baseCurrency ? (
                          <InputGroupAddon align="inline-end">
                            <InputGroupText className="text-[0.65rem] font-semibold text-violet-700">
                              {baseCurrency}
                            </InputGroupText>
                          </InputGroupAddon>
                        ) : null}
                      </InputGroup>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>

          <CardFooter className="flex flex-col-reverse gap-2 border-t border-border/60 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full gap-2 border-dashed sm:w-auto"
              disabled={!hasPriceProfile}
              onClick={() => setRows((r) => [...r, emptyRow()])}
            >
              <Plus className="size-4" />
              {t("addPlan")}
            </Button>
            <Button
              size="sm"
              className="w-full bg-[linear-gradient(110deg,#7c3aed_0%,#9333ea_50%,#db2777_100%)] sm:w-auto sm:min-w-30"
              disabled={replace.isPending || isPending || !hasPriceProfile}
              onClick={() => void handleSave()}
            >
              {t("save")}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
