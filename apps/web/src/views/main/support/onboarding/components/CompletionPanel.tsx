"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { MEZON_URL, ROUTES, type OnboardingRole } from "@mezon-tutors/shared";
import { LoginButton } from "@/components/auth/LoginButton";

type CompletionPanelProps = {
  role: OnboardingRole;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
};

export function CompletionPanel({
  role,
  isAuthenticated,
  isAuthLoading,
}: CompletionPanelProps) {
  const t = useTranslations("Onboarding");
  const primaryHref =
    role === "student" ? ROUTES.DASHBOARD.MY_LESSONS : MEZON_URL;
  const primaryLabel =
    role === "student"
      ? t("completion.studentCta")
      : role === "utilities"
        ? t("completion.utilitiesCta")
        : t("completion.tutorCta");
  const secondaryHref =
    role === "student"
      ? ROUTES.TUTOR.INDEX
      : ROUTES.DASHBOARD.INDEX;
  const secondaryLabel =
    role === "student"
      ? t("completion.findTutorCta")
      : role === "utilities"
        ? t("completion.utilitiesSecondaryCta")
        : t("completion.dashboardCta");

  return (
    <div className="flex flex-col items-center gap-6 py-4 text-center animate-in fade-in zoom-in-95 duration-500">
      <div className="relative">
        <div className="absolute inset-0 animate-ping rounded-full bg-emerald-400/20" />
        <div className="relative flex size-20 items-center justify-center rounded-full bg-[linear-gradient(135deg,#7c3aed,#ec4899)] text-white shadow-xl shadow-violet-300/50">
          <Check className="size-10" strokeWidth={3} />
        </div>
      </div>

      <div className="max-w-md space-y-2">
        <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
          {t("completion.title")}
        </h2>
        <p className="text-sm leading-6 text-slate-600 sm:text-base">
          {t("completion.description")}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {isAuthLoading ? (
          <div className="h-10 w-48 animate-pulse rounded-full bg-violet-100" />
        ) : isAuthenticated ? (
          <>
            {primaryHref.startsWith("http") ? (
              <a
                href={primaryHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 cursor-pointer items-center justify-center rounded-full bg-[linear-gradient(110deg,#7c3aed_0%,#9333ea_50%,#db2777_100%)] px-6 text-sm font-semibold text-white shadow-md shadow-violet-300/40 transition-all hover:shadow-lg hover:shadow-violet-400/50"
              >
                {primaryLabel}
              </a>
            ) : (
              <Link
                href={primaryHref}
                className="inline-flex h-10 cursor-pointer items-center justify-center rounded-full bg-[linear-gradient(110deg,#7c3aed_0%,#9333ea_50%,#db2777_100%)] px-6 text-sm font-semibold text-white shadow-md shadow-violet-300/40 transition-all hover:shadow-lg hover:shadow-violet-400/50"
              >
                {primaryLabel}
              </Link>
            )}
            <Link
              href={secondaryHref}
              className="inline-flex h-10 cursor-pointer items-center justify-center rounded-full border border-violet-200 bg-white px-6 text-sm font-semibold text-violet-700 transition-colors hover:border-violet-300 hover:bg-violet-50"
            >
              {secondaryLabel}
            </Link>
          </>
        ) : (
          <LoginButton label={primaryLabel} />
        )}
      </div>
    </div>
  );
}
