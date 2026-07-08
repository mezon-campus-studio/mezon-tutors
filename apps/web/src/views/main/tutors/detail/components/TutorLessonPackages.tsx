"use client";

import {
  ECurrency,
  formatToCurrency,
  ROUTES,
  type TutorAboutDto,
  type TutorSubscriptionPlanDto,
} from "@mezon-tutors/shared";
import { ChevronRight, FileText, Users } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { usePublicAppSettings } from "@/services";
import { useTutorBooking } from "../hooks/TutorBookingContext";

type TutorLessonPackagesProps = {
  tutor: TutorAboutDto;
};

type PackageVariant = "trial" | "monthly" | "group";

type LessonCardProps = {
  title: string;
  subtitle: string;
  priceLabel: string;
  priceSuffix?: string;
  secondPriceLabel?: string;
  secondPriceSuffix?: string;
  href?: string;
  onClick?: () => void;
  icon?: "document" | "group";
  variant: PackageVariant;
  disabled?: boolean;
  disabledHint?: string;
  badge?: string;
};

const variantStyles: Record<
  PackageVariant,
  {
    card: string;
    icon: string;
    title: string;
    price: string;
    badge: string;
  }
> = {
  trial: {
    card: "border-amber-200/90 bg-gradient-to-br from-amber-50 via-white to-orange-50/80 hover:border-amber-300 hover:shadow-md hover:shadow-amber-100/80",
    icon: "text-amber-600",
    title: "text-amber-950",
    price: "text-amber-700",
    badge: "bg-amber-100 text-amber-800",
  },
  monthly: {
    card: "border-violet-200/90 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50/60 hover:border-violet-300 hover:shadow-md hover:shadow-violet-100/80",
    icon: "text-violet-600",
    title: "text-violet-950",
    price: "text-violet-700",
    badge: "bg-violet-100 text-violet-800",
  },
  group: {
    card: "border-fuchsia-200/90 bg-gradient-to-br from-fuchsia-50 via-white to-violet-50/60 hover:border-fuchsia-300 hover:shadow-md hover:shadow-fuchsia-100/80",
    icon: "text-fuchsia-600",
    title: "text-fuchsia-950",
    price: "text-fuchsia-700",
    badge: "bg-emerald-100 text-emerald-800",
  },
};

function LessonCard({
  title,
  subtitle,
  priceLabel,
  priceSuffix,
  secondPriceLabel,
  secondPriceSuffix,
  href,
  onClick,
  icon = "document",
  variant,
  disabled = false,
  disabledHint,
  badge,
}: LessonCardProps) {
  const TrailingIcon = icon === "group" ? Users : FileText;
  const styles = variantStyles[variant];

  const cardClasses = cn(
    "flex min-h-[148px] flex-col justify-between rounded-2xl border p-5 transition-all",
    disabled
      ? "cursor-not-allowed border-gray-100 bg-gray-50 opacity-60"
      : cn("cursor-pointer", styles.card),
  );

  const cardInner = (
    <>
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3
            className={cn(
              "text-base font-bold",
              disabled ? "text-gray-500" : styles.title,
            )}
          >
            {title}
          </h3>
          <TrailingIcon
            className={cn(
              "size-4 shrink-0",
              disabled ? "text-gray-400" : styles.icon,
            )}
          />
        </div>
        <p className="text-sm text-gray-500">{subtitle}</p>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <div className="flex flex-wrap items-baseline gap-1.5">
            <span
              className={cn(
                "text-sm font-bold",
                disabled ? "text-gray-400" : styles.price,
              )}
            >
              {priceLabel}
            </span>
            {priceSuffix ? (
              <span className="text-sm font-medium text-slate-500">{priceSuffix}</span>
            ) : null}
            {badge && !disabled ? (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-semibold",
                  styles.badge,
                )}
              >
                {badge}
              </span>
            ) : null}
          </div>
          {secondPriceLabel ? (
            <div className="flex flex-wrap items-baseline gap-1.5">
              <span
                className={cn(
                  "text-sm font-bold",
                  disabled ? "text-gray-400" : styles.price,
                )}
              >
                {secondPriceLabel}
              </span>
              {secondPriceSuffix ? (
                <span className="text-sm font-medium text-slate-500">{secondPriceSuffix}</span>
              ) : null}
            </div>
          ) : null}
        </div>
        <ChevronRight
          className={cn("size-4", disabled ? "text-gray-300" : styles.icon)}
        />
      </div>
    </>
  );

  const content = disabled && disabledHint ? (
    <Tooltip>
      <TooltipTrigger render={<div className={cardClasses}>{cardInner}</div>} />
      <TooltipContent>{disabledHint}</TooltipContent>
    </Tooltip>
  ) : (
    <div className={cardClasses}>{cardInner}</div>
  );

  if (disabled) {
    return <div className="block min-w-0 flex-1">{content}</div>;
  }

  if (href) {
    return (
      <Link href={href} className="block min-w-0 flex-1 cursor-pointer">
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="block min-w-0 flex-1 cursor-pointer text-left"
    >
      {content}
    </button>
  );
}

function planPrice(plan: TutorSubscriptionPlanDto, currency: ECurrency): number {
  if (currency === ECurrency.USD) return plan.price.usd;
  if (currency === ECurrency.PHP) return plan.price.php;
  return plan.price.vnd;
}

function pickPrimaryPlan(
  plans: TutorSubscriptionPlanDto[],
): TutorSubscriptionPlanDto | null {
  if (plans.length === 0) return null;
  return [...plans].sort((a, b) => a.lessonsPerWeek - b.lessonsPerWeek)[0];
}

export function TutorLessonPackages({ tutor }: TutorLessonPackagesProps) {
  const t = useTranslations("Tutors.Detail");
  const tSubject = useTranslations("Tutors.Filter.Subject");
  const booking = useTutorBooking();
  const { data: appSettings } = usePublicAppSettings();

  const primaryPlan = useMemo(
    () => pickPrimaryPlan(booking.subscriptionPlans),
    [booking.subscriptionPlans],
  );

  const groupDiscountRate = appSettings?.subscriptionGroupDiscountRate ?? 1;
  const groupDiscountPercent = Math.round((1 - groupDiscountRate) * 100);

  const baseSubscriptionPrice = primaryPlan
    ? planPrice(primaryPlan, booking.currency)
    : null;

  const perLessonPrice =
    primaryPlan && baseSubscriptionPrice != null
      ? Math.round(baseSubscriptionPrice / (primaryPlan.lessonsPerWeek * 4))
      : null;

  const perLessonLabel =
    perLessonPrice != null
      ? `${formatToCurrency(booking.currency, perLessonPrice)}+`
      : "—";

  const discountedPerLessonPrice =
    perLessonPrice != null
      ? Math.round(perLessonPrice * groupDiscountRate)
      : null;

  const groupPriceLabel =
    discountedPerLessonPrice != null
      ? `${formatToCurrency(booking.currency, discountedPerLessonPrice)}+`
      : "—";

  const groupDiscountBadge =
    groupDiscountPercent > 0
      ? t("packageDiscountBadge", { percent: groupDiscountPercent })
      : undefined;

  const cards = useMemo(() => {
    if (booking.isOwnProfile) {
      return [];
    }

    const trialEnabled =
      booking.showBookTrial &&
      !booking.bookTrialDisabled &&
      !booking.showContinuePayment &&
      !booking.showBusyBadge;

    const subscribeEnabled = booking.showSubscribe && Boolean(primaryPlan);

    const trialDisabledHint = booking.showContinuePayment
      ? t("continuePayment")
      : booking.showBusyBadge
        ? t("temporarilyBusy")
        : booking.bookTrialDisabled
          ? t("bookTrialDisabledHint")
          : !booking.showBookTrial
            ? t("trialAlreadyBookedWarning")
            : undefined;

    const subscribeDisabledHint = booking.showContinuePayment
      ? t("continuePayment")
      : booking.showBusyBadge
        ? t("temporarilyBusy")
        : booking.isAlreadyEnrolled
          ? t("packageAlreadyEnrolled")
          : !primaryPlan
            ? t("packageNoPlans")
            : !booking.showSubscribe
              ? t("packageCompleteTrialFirst")
              : undefined;

    return [
      {
        key: "trial",
        variant: "trial" as const,
        title: t("trialLesson"),
        subtitle: t("trialLessonSubtitle"),
        priceLabel: `${formatToCurrency(booking.currency, Math.round(booking.lessonPrice / 2))}`,
        priceSuffix: t("perHalfTrialLesson"),
        secondPriceLabel: `${formatToCurrency(booking.currency, booking.lessonPrice)}`,
        secondPriceSuffix: t("perTrialLesson"),
        onClick: () => booking.setIsTrialBookingSheetOpen(true),
        disabled: !trialEnabled,
        disabledHint: trialDisabledHint,
      },
      {
        key: "monthly",
        variant: "monthly" as const,
        title: t("subscribeMonthly"),
        subtitle: t("monthlyPlanSubtitle"),
        priceLabel: perLessonLabel,
        priceSuffix: t("perSubLesson"),
        href: `${ROUTES.CHECKOUT.SUBSCRIPTION_PLAN}?tutorId=${encodeURIComponent(tutor.id)}`,
        disabled: !subscribeEnabled,
        disabledHint: subscribeDisabledHint,
      },
      {
        key: "group",
        variant: "group" as const,
        title: t("subscribeGroup"),
        subtitle: t("groupPlanSubtitle"),
        priceLabel: groupPriceLabel,
        priceSuffix: t("perGroupLesson"),
        href: `${ROUTES.DASHBOARD.GROUPS}?tutorId=${tutor.id}`,
        icon: "group" as const,
        disabled: !subscribeEnabled,
        disabledHint: subscribeDisabledHint,
        badge: groupDiscountBadge,
      },
    ];
  }, [
    booking,
    groupDiscountBadge,
    groupPriceLabel,
    perLessonLabel,
    t,
    tutor.id,
  ]);

  if (cards.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-bold text-gray-900">
        {tSubject(tutor.subject)}
      </h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ key, ...card }) => (
          <LessonCard key={key} {...card} />
        ))}
      </div>
    </div>
  );
}
