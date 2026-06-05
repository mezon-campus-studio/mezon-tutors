"use client";

import { AlertCircle, CheckCircle2, Copy, Loader2, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Label,
  Skeleton,
  toast,
} from "@/components/ui";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ApiError } from "@/services/api-client";
import { useGetSubscriptionEnrollment } from "@/services";
import { walletQueryKey } from "@/services/wallet/wallet.qkey";
import { isAuthenticatedAtom } from "@/store/auth.atom";
import {
  ECurrency,
  LESSON_CHECKOUT_SLOT_UNAVAILABLE_AFTER_PAYMENT_CODE,
  ROUTES,
  formatToCurrency,
} from "@mezon-tutors/shared";

function formatPaidAt(iso: string | null, locale: string): string | null {
  if (!iso) {
    return null;
  }
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function LoadingView({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-linear-to-b from-muted/30 via-background to-background px-5 py-12 sm:px-8">
      <Card className="mx-auto max-w-3xl gap-0 border-0 bg-transparent py-0 shadow-none ring-0">
        <CardHeader className="flex flex-row items-center justify-center gap-2 px-0 pb-4 text-sm text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          <CardDescription className="text-sm">{message}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-0">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function SubscriptionPlanCheckoutSuccessPage({
  enrollmentId,
}: {
  enrollmentId: string;
}) {
  const t = useTranslations("SubscriptionCheckout.Result.subscriptionSuccess");
  const locale = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const [authHydrated, setAuthHydrated] = useState(false);

  useEffect(() => {
    setAuthHydrated(true);
  }, []);

  const canFetch = authHydrated && Boolean(enrollmentId) && isAuthenticated;
  const { data, isPending, isError, error, refetch, isFetching } = useGetSubscriptionEnrollment(
    enrollmentId,
    canFetch,
  );

  useEffect(() => {
    if (data?.paymentStatus === "SUCCEEDED") {
      void queryClient.invalidateQueries({ queryKey: walletQueryKey.all });
    }
  }, [data?.paymentStatus, queryClient]);

  useEffect(() => {
    if (
      data?.paymentStatus === "REFUNDED" &&
      data?.status === "CANCELLED"
    ) {
      router.replace(
        `${ROUTES.CHECKOUT.SUBSCRIPTION_PLAN_CANCEL_WITH_CODE(LESSON_CHECKOUT_SLOT_UNAVAILABLE_AFTER_PAYMENT_CODE)}&enrollmentId=${encodeURIComponent(enrollmentId)}`,
      );
    }
  }, [data?.paymentStatus, data?.status, enrollmentId, router]);

  const amountLabel = useMemo(() => {
    if (!data) {
      return "";
    }
    return formatToCurrency(data.currency as ECurrency, data.grossAmount);
  }, [data]);

  const paymentLabel = useMemo(() => {
    if (!data?.paymentStatus) {
      return "";
    }
    switch (data.paymentStatus) {
      case "SUCCEEDED":
        return t("paymentStatus.SUCCEEDED");
      case "PENDING":
        return t("paymentStatus.PENDING");
      case "FAILED":
        return t("paymentStatus.FAILED");
      case "REFUNDED":
        return t("paymentStatus.REFUNDED");
      default:
        return data.paymentStatus;
    }
  }, [data, t]);

  const enrollmentStatusLabel = useMemo(() => {
    if (!data?.status) {
      return "";
    }
    switch (data.status) {
      case "PENDING_PAYMENT":
        return t("enrollmentStatus.PENDING_PAYMENT");
      case "ACTIVE":
        return t("enrollmentStatus.ACTIVE");
      case "CANCELLED":
        return t("enrollmentStatus.CANCELLED");
      default:
        return data.status;
    }
  }, [data, t]);

  const paidAtLabel = formatPaidAt(data?.paidAt ?? null, locale);
  const isUnauthorized = isError && error instanceof ApiError && error.status === 401;
  const isNotFound = isError && error instanceof ApiError && error.status === 404;

  const copyRef = () => {
    if (!data?.id) {
      return;
    }
    void navigator.clipboard.writeText(data.id);
    toast.success(t("copiedToast"));
  };

  if (!enrollmentId) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4 py-10">
        <Card className="w-full max-w-lg text-center shadow-sm">
          <CardHeader>
            <CardDescription>{t("notFound")}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-6">
            <Link href={ROUTES.TUTOR.INDEX} className={cn(buttonVariants({ size: "lg" }))}>
              {t("ctaTutors")}
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!authHydrated) {
    return <LoadingView message={t("loading")} />;
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4 py-10">
        <Card className="w-full max-w-lg text-center shadow-sm">
          <CardHeader className="items-center space-y-4">
            <AlertCircle className="size-14 text-amber-500" aria-hidden />
            <CardTitle className="text-2xl font-bold">{t("unauthorizedTitle")}</CardTitle>
            <CardDescription className="text-base">{t("unauthorizedDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-6">
            <Link href={ROUTES.HOME.index} className={cn(buttonVariants({ size: "lg" }))}>
              {t("ctaHome")}
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isPending && !data) {
    return <LoadingView message={t("loading")} />;
  }

  if (isError && !data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4 py-10">
        <Card className="w-full max-w-lg text-center shadow-sm">
          <CardHeader className="items-center space-y-4">
            <AlertCircle className="size-12 text-destructive" aria-hidden />
            <CardTitle className="text-xl font-semibold">{t("errorTitle")}</CardTitle>
            <CardDescription className="text-base">
              {isUnauthorized
                ? t("unauthorizedDescription")
                : isNotFound
                  ? t("notFound")
                  : t("errorDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap justify-center gap-2 pb-6">
            <Button variant="outline" onClick={() => refetch()} disabled={isFetching} type="button">
              {isFetching ? <Loader2 className="size-4 animate-spin" /> : null}
              {t("retry")}
            </Button>
            <Link href={ROUTES.TUTOR.INDEX} className={cn(buttonVariants({ variant: "default" }))}>
              {t("ctaTutors")}
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const paymentBadgeVariant =
    data.paymentStatus === "SUCCEEDED"
      ? "default"
      : data.paymentStatus === "PENDING"
        ? "secondary"
        : "destructive";

  return (
    <div className="relative min-h-screen bg-linear-to-b from-muted/30 via-background to-muted/15">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[min(52vh,420px)] bg-[radial-gradient(ellipse_75%_55%_at_50%_0%,hsl(var(--primary)/0.09),transparent)]"
      />

      <div className="flex flex-col-reverse gap-3 px-4 pt-5 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-3">
        <Link
          href={ROUTES.TUTOR.INDEX}
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "min-h-11 w-full justify-center sm:w-auto sm:min-w-[180px]",
          )}
        >
          {t("ctaTutors")}
        </Link>
        <Link
          href={ROUTES.DASHBOARD.MY_LESSONS}
          className={cn(
            buttonVariants({ size: "lg" }),
            "min-h-11 w-full justify-center shadow-md sm:w-auto sm:min-w-[220px]",
          )}
        >
          {t("ctaMyLessons")}
        </Link>
      </div>

      <div className="relative mx-auto flex w-full max-w-3xl flex-col items-stretch px-4 pb-16 pt-5 sm:px-6 sm:pb-20 sm:pt-8">
        <header className="mb-8 flex flex-col items-center gap-5 sm:mb-10 sm:flex-row sm:items-start sm:gap-6">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/11 text-emerald-600 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] ring-1 ring-emerald-500/15 dark:bg-emerald-500/12 dark:text-emerald-400 dark:ring-emerald-500/25">
            <CheckCircle2 className="size-9 stroke-[1.75]" />
          </div>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <Badge
              variant="outline"
              className="mb-3 gap-1.5 border-border/80 bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur-sm"
            >
              <Sparkles className="size-3.5 text-primary" />
              {t("badge")}
            </Badge>
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {t("headline")}
            </h1>
            <CardDescription className="mt-2 max-w-xl text-pretty text-[15px] leading-relaxed sm:text-base">
              {t("subheadline")}
            </CardDescription>
          </div>
        </header>

        <div className="space-y-5">
          <Card className="w-full gap-0 overflow-hidden rounded-2xl border border-primary bg-card/95 py-0 shadow-sm ring-1 ring-black/5">
            <CardHeader className="gap-4 bg-muted/35 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="min-w-0 flex-1 space-y-1.5 text-left">
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                  {t("enrollmentRef")}
                </Label>
                <CardTitle className="break-all font-mono text-xs font-normal leading-relaxed text-foreground sm:text-sm">
                  {data.id}
                </CardTitle>
              </div>
              <Button variant="outline" size="sm" className="gap-2" type="button" onClick={copyRef}>
                <Copy className="size-4" />
                {t("copyRef")}
              </Button>
            </CardHeader>
          </Card>

          <Card className="w-full gap-0 overflow-hidden rounded-2xl border border-primary bg-card/95 py-0 shadow-sm ring-1 ring-black/5">
            <CardContent className="grid gap-0 divide-y divide-border/45 p-0 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
              <div className="space-y-3 p-5 sm:p-6">
                <Label className="text-xs font-semibold uppercase tracking-wide text-primary">
                  {t("tutorSection")}
                </Label>
                <div className="flex min-w-0 gap-3">
                  <Avatar className="size-14 shrink-0 rounded-xl">
                    {data.tutor.avatarUrl ? (
                      <AvatarImage src={data.tutor.avatarUrl} alt="" className="rounded-xl" />
                    ) : null}
                    <AvatarFallback className="rounded-xl bg-muted/40">
                      <Users className="size-7 text-muted-foreground" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <CardTitle className="text-lg font-bold leading-tight">{data.tutor.displayName}</CardTitle>
                    <CardDescription className="mt-1 text-sm">
                      {t("lessonsPerWeekLabel", { n: data.lessonsPerWeek })}
                    </CardDescription>
                  </div>
                </div>
              </div>
              <div className="space-y-3 bg-muted/20 p-5 sm:bg-muted/25 sm:p-6">
                <Label className="text-xs font-semibold uppercase tracking-wide text-primary">
                  {t("paymentSection")}
                </Label>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={paymentBadgeVariant}>{paymentLabel}</Badge>
                  <Badge variant="outline">{enrollmentStatusLabel}</Badge>
                </div>
                <CardTitle className="mt-2 text-2xl font-bold tabular-nums tracking-tight sm:text-3xl">
                  {amountLabel}
                </CardTitle>
                <CardDescription className="text-xs">{t("amountPaid")}</CardDescription>
                {paidAtLabel ? (
                  <CardDescription className="mt-2 text-xs">
                    {t("paidAt")}: {paidAtLabel}
                  </CardDescription>
                ) : null}
                {data.paymentStatus === "PENDING" ? (
                  <Card className="mt-3 gap-0 border-amber-500/25 bg-amber-500/10 py-3 shadow-none ring-0 dark:bg-amber-500/10">
                    <CardContent className="px-3 py-0">
                      <CardDescription className="text-xs leading-relaxed text-amber-950 dark:text-amber-100">
                        {t("pendingPaymentHint")}
                      </CardDescription>
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
