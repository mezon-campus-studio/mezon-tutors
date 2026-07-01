"use client";

import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  BECOME_TUTOR_STEPS,
  GUIDE_HIGHLIGHTS,
  GUIDE_STEPS,
  getStepRoute,
  type GuideHighlight,
  type GuideHighlightIconKey,
  type GuideStep,
} from "@mezon-tutors/shared";
import { useAtomValue } from "jotai";
import Link from "next/link";
import { LoginButton } from "@/components/auth/LoginButton";
import { Badge } from "@/components/ui";
import { isAuthenticatedAtom, isLoadingAtom } from "@/store";

const CTA_PRIMARY_CLASS =
  "group relative inline-flex h-9 items-center justify-center overflow-hidden rounded-full bg-brand-gradient px-6 text-sm font-semibold tracking-wide text-white shadow-md shadow-violet-300/40 transition-all duration-300 hover:shadow-lg hover:shadow-violet-400/50 active:scale-[0.97]";

const HIGHLIGHT_ICON_BY_KEY: Record<GuideHighlightIconKey, typeof Wallet> = {
  setOwnRate: Wallet,
  teachAnytime: Clock,
  growProfessionally: TrendingUp,
};

const HIGHLIGHT_ACCENT_BY_KEY: Record<GuideHighlightIconKey, string> = {
  setOwnRate: "from-violet-500 to-purple-500",
  teachAnytime: "from-purple-500 to-fuchsia-500",
  growProfessionally: "from-fuchsia-500 to-rose-500",
};

const STEP_ACCENTS = [
  "from-violet-500 to-purple-500",
  "from-purple-500 to-fuchsia-500",
  "from-fuchsia-500 to-rose-500",
];

function GuideStepCard({ step, index }: { step: GuideStep; index: number }) {
  const t = useTranslations("BecomeTutorGuide");
  const accent = STEP_ACCENTS[index] ?? STEP_ACCENTS[0];

  return (
    <div className="relative flex flex-1 flex-col items-center gap-3 rounded-3xl bg-white px-5 py-6 ring-1 ring-violet-100 transition-all hover:-translate-y-0.5 hover:shadow-md hover:shadow-violet-200/40">
      <div className="absolute -top-3 right-5 rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-600 shadow-sm ring-1 ring-violet-100">
        {t("stepBadge", { step: step.number })}
      </div>
      <div
        className={`flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br ${accent} text-white shadow-lg shadow-violet-300/40`}
      >
        <span className="text-xl font-extrabold">{step.number}</span>
      </div>
      <h2 className="text-center text-xl font-extrabold text-slate-900">
        {t(step.titleKey)}
      </h2>
      <p className="max-w-[260px] text-center text-sm leading-6 text-slate-600">
        {t(step.descriptionKey)}
      </p>
    </div>
  );
}

function GuideHighlightCard({ item }: { item: GuideHighlight }) {
  const t = useTranslations("BecomeTutorGuide");
  const Icon = HIGHLIGHT_ICON_BY_KEY[item.iconKey];
  const accent = HIGHLIGHT_ACCENT_BY_KEY[item.iconKey];

  return (
    <div className="group relative flex-1 cursor-pointer overflow-hidden rounded-3xl border border-violet-100 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-violet-200 hover:shadow-xl hover:shadow-violet-200/40">
      <div
        className={`pointer-events-none absolute -top-12 -right-12 size-32 rounded-full bg-gradient-to-br ${accent} opacity-15 blur-2xl transition-opacity duration-300 group-hover:opacity-30`}
      />

      <div className="relative flex h-full flex-col gap-4">
        <div
          className={`inline-flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br ${accent} text-white shadow-md shadow-violet-300/40`}
        >
          <Icon className="size-6" />
        </div>

        <h3 className="text-xl font-extrabold leading-tight text-slate-900 sm:text-2xl">
          {t(item.titleKey)}
        </h3>

        <p className="text-sm leading-6 text-slate-600">
          {t(item.descriptionKey)}
        </p>

        <div className="mt-auto flex items-center justify-between border-t border-violet-50 pt-4">
          <span
            className={`text-brand-gradient text-[10px] font-bold uppercase tracking-[0.18em]`}
          >
            {t(item.tagKey)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function BecomeTutorGuide() {
  const t = useTranslations("BecomeTutorGuide");
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const isAuthLoading = useAtomValue(isLoadingAtom);
  const aboutStepHref = getStepRoute(BECOME_TUTOR_STEPS.ABOUT);

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#faf7ff_0%,#ffffff_70%)]" />
        <div className="absolute -top-40 left-1/2 size-[44rem] -translate-x-1/2 rounded-full bg-violet-300/35 blur-[140px]" />
        <div className="absolute top-1/3 -right-24 size-[28rem] rounded-full bg-fuchsia-200/40 blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgb(108 92 231) 1px, transparent 0)",
            backgroundSize: "32px 32px",
            maskImage:
              "radial-gradient(ellipse 80% 60% at 50% 30%, black 30%, transparent 80%)",
          }}
        />
      </div>

      <div className="mx-auto w-full max-w-5xl px-5 pt-12 pb-16 sm:pt-16 lg:px-8">
        <div className="overflow-hidden rounded-[2rem] border border-violet-100 bg-white/80 shadow-sm shadow-violet-100/40 backdrop-blur">
          <div className="px-6 pt-12 pb-8 text-center sm:px-12 sm:pt-16 sm:pb-12">
            <Badge className="mx-auto mb-5 h-auto rounded-full border border-violet-200/70 bg-white px-3.5 py-1.5 text-xs font-semibold text-violet-700 shadow-sm shadow-violet-100/50 animate-in fade-in slide-in-from-bottom-3 duration-700">
              <Sparkles className="mr-1.5 size-3.5" />
              {t("badgeForTutors")}
            </Badge>

            <h1 className="text-balance text-3xl font-extrabold leading-tight tracking-tight text-slate-900 animate-in fade-in slide-in-from-bottom-4 duration-700 sm:text-5xl">
              {t("title")}{" "}
              <span className="text-brand-gradient">
                {t("titleHighlight")}
              </span>
            </h1>

            <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-600 animate-in fade-in slide-in-from-bottom-4 duration-700 [animation-delay:120ms] [animation-fill-mode:both] sm:text-base sm:leading-7">
              {t("subtitle")}
            </p>

            <div className="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-3">
              {GUIDE_STEPS.map((step, index) => (
                <GuideStepCard key={step.id} step={step} index={index} />
              ))}
            </div>

            <div className="mt-10 flex flex-col items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-700 [animation-delay:360ms] [animation-fill-mode:both]">
              {isAuthLoading ? (
                <div
                  className="h-9 w-[min(100%,280px)] max-w-[280px] animate-pulse rounded-full bg-violet-100"
                  role="status"
                  aria-busy
                  aria-label={t("authLoadingAria")}
                />
              ) : isAuthenticated ? (
                <Link href={aboutStepHref} className={CTA_PRIMARY_CLASS}>
                  <span className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(110deg,transparent_30%,rgba(255,255,255,0.35)_50%,transparent_70%)] transition-transform duration-700 ease-out group-hover:translate-x-full" />
                  <span className="relative">{t("startTutorProfile")}</span>
                </Link>
              ) : (
                <LoginButton label={t("loginNow")} />
              )}
              <p className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                <CheckCircle2 className="size-3.5 text-emerald-500" />
                {!isAuthLoading && isAuthenticated ? t("ctaNoteLoggedIn") : t("ctaNote")}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {GUIDE_HIGHLIGHTS.map((item) => (
            <GuideHighlightCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </main>
  );
}
