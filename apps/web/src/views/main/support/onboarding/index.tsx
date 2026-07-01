"use client";

import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useAtomValue } from "jotai";
import {
  ONBOARDING_ACTION_ROUTES_BY_ROLE,
  ONBOARDING_PROFILE_ROLES,
  ONBOARDING_SECTIONS,
  ONBOARDING_STEPS_BY_ROLE,
  OnboardingStepConfig,
  buildUtilitiesChannelAppTipLinks,
  type OnboardingProfileRole,
  type OnboardingRole,
  type OnboardingSection,
} from "@mezon-tutors/shared";
import { Badge, Button } from "@/components/ui";
import { useOpenAdminSupportChat } from "@/hooks/useOpenAdminSupportChat";
import { usePublicAppSettings } from "@/services/app-settings/app-settings.api";
import { isAuthenticatedAtom, isLoadingAtom, userAtom } from "@/store";
import { CompletionPanel } from "./components/CompletionPanel";
import { OnboardingBackground } from "./components/OnboardingBackground";
import { StepDetailPanel } from "./components/StepDetailPanel";
import { StepNavRail } from "./components/StepNavRail";

export default function OnboardingView() {
  const t = useTranslations("Onboarding");
  const user = useAtomValue(userAtom);
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const isAuthLoading = useAtomValue(isLoadingAtom);
  const { openAdminSupportChat, isOpening } = useOpenAdminSupportChat();
  const { data: publicSettings } = usePublicAppSettings();

  const searchParams = useSearchParams();
  const deepLinkApplied = useRef(false);

  const [section, setSection] = useState<OnboardingSection>("roleGuide");
  const [profileRole, setProfileRole] = useState<OnboardingProfileRole>("student");
  const [activeIndex, setActiveIndex] = useState(0);

  const role: OnboardingRole =
    section === "utilities" ? "utilities" : profileRole;

  useEffect(() => {
    setProfileRole(user?.role === "TUTOR" ? "tutor" : "student");
  }, [user?.role]);

  const steps = ONBOARDING_STEPS_BY_ROLE[role];
  const activeStep = steps[activeIndex];
  const isComplete = activeIndex >= steps.length;
  const progressPercent = isComplete
    ? 100
    : Math.round(((activeIndex + 1) / steps.length) * 100);

  const resetToStart = useCallback(() => {
    setActiveIndex(0);
  }, []);

  useEffect(() => {
    if (deepLinkApplied.current) return;
    resetToStart();
  }, [role, resetToStart]);

  useEffect(() => {
    if (deepLinkApplied.current) return;

    const sectionParam = searchParams?.get("section");
    const stepParam = searchParams?.get("step");
    if (!sectionParam || !stepParam) return;

    if (ONBOARDING_SECTIONS.includes(sectionParam as OnboardingSection)) {
      setSection(sectionParam as OnboardingSection);
    }

    if (sectionParam === "roleGuide") {
      setProfileRole("tutor");
    }

    const resolvedRole: OnboardingRole =
      sectionParam === "utilities" ? "utilities" : "tutor";
    const resolvedSteps = ONBOARDING_STEPS_BY_ROLE[resolvedRole];
    const idx = resolvedSteps.findIndex((s) => s.id === stepParam);
    if (idx >= 0) {
      setActiveIndex(idx);
    }

    deepLinkApplied.current = true;
  }, [searchParams]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" && activeIndex < steps.length - 1) {
        setActiveIndex((prev) => prev + 1);
      }
      if (event.key === "ArrowLeft" && activeIndex > 0) {
        setActiveIndex((prev) => prev - 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, steps.length]);

  const handleNext = () => {
    if (activeIndex < steps.length - 1) {
      setActiveIndex((prev) => prev + 1);
      return;
    }
    setActiveIndex(steps.length);
  };

  const handlePrev = () => {
    if (isComplete) {
      setActiveIndex(steps.length - 1);
      return;
    }
    setActiveIndex((prev) => Math.max(0, prev - 1));
  };

  const mezonLinks = publicSettings?.mezonLinks ?? null;

  const tipLinks = useMemo(() => {
    if (role !== "utilities" || activeStep?.id !== "channelApps") {
      return {};
    }
    return buildUtilitiesChannelAppTipLinks(mezonLinks);
  }, [role, activeStep?.id, mezonLinks]);

  const actionHref = useMemo(() => {
    if (role === "tutor" && activeStep?.id === "inviteBot") {
      return mezonLinks?.botInviteLink;
    }
    return ONBOARDING_ACTION_ROUTES_BY_ROLE[role][activeStep?.id];
  }, [role, activeStep?.id, mezonLinks]);

  const actionLabel =
    role === "student"
      ? t("goToDashboard")
      : role === "tutor" && activeStep?.id === "inviteBot"
        ? t("goToBotInvite")
        : t("goToMezon");

  return (
    <main className="relative min-h-screen overflow-hidden">
      <OnboardingBackground />

      <div className="mx-auto w-full max-w-6xl px-5 pt-10 pb-28 sm:pt-14 lg:px-8">
        <div className="mb-8 text-center sm:mb-10">
          <Badge className="mx-auto mb-4 h-auto rounded-full border border-violet-200/70 bg-white px-3.5 py-1.5 text-xs font-semibold text-violet-700 shadow-sm shadow-violet-100/50 animate-in fade-in slide-in-from-bottom-3 duration-700">
            <Sparkles className="mr-1.5 size-3.5" />
            {t("badge")}
          </Badge>

          <h1 className="text-balance text-3xl font-extrabold leading-tight tracking-tight text-slate-900 animate-in fade-in slide-in-from-bottom-4 duration-700 sm:text-5xl">
            {t("title")}{" "}
            <span className="text-brand-gradient">
              {t("titleHighlight")}
            </span>
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600 animate-in fade-in slide-in-from-bottom-4 duration-700 [animation-delay:100ms] [animation-fill-mode:both] sm:text-base">
            {t(`${role}.intro`)}
          </p>
        </div>

        <div className="mb-6 flex flex-col items-center gap-4 sm:mb-8">
          <div className="flex flex-col items-center gap-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-500">
              {t("sectionLabel")}
            </p>
            <div className="inline-flex max-w-full flex-wrap justify-center gap-1 rounded-full border border-violet-100 bg-white/80 p-1 shadow-sm shadow-violet-100/40 backdrop-blur">
              {ONBOARDING_SECTIONS.map((item) => {
                const isActive = section === item;
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setSection(item)}
                    className={`relative cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300 sm:px-5 ${
                      isActive
                        ? "bg-brand-gradient text-white shadow-md shadow-violet-300/40"
                        : "text-slate-600 hover:text-violet-700"
                    }`}
                  >
                    {t(`sections.${item}`)}
                  </button>
                );
              })}
            </div>
          </div>

          {section === "roleGuide" ? (
            <div className="flex flex-col items-center gap-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-500">
                {t("roleLabel")}
              </p>
              <div className="inline-flex max-w-full flex-wrap justify-center gap-1 rounded-full border border-slate-200/80 bg-slate-50/80 p-1 shadow-sm backdrop-blur">
                {ONBOARDING_PROFILE_ROLES.map((item) => {
                  const isActive = profileRole === item;
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setProfileRole(item)}
                      className={`relative cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300 sm:px-5 ${
                        isActive
                          ? "bg-white text-violet-700 shadow-sm ring-1 ring-violet-200"
                          : "text-slate-600 hover:text-violet-700"
                      }`}
                    >
                      {t(`roles.${item}`)}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-violet-100 bg-white/80 shadow-sm shadow-violet-100/40 backdrop-blur">
          <div className="border-b border-violet-100 px-5 py-4 sm:px-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-semibold text-slate-500">
                {isComplete
                  ? t("progress", { current: steps.length, total: steps.length })
                  : t("progress", {
                      current: activeIndex + 1,
                      total: steps.length,
                    })}
              </p>
              <p className="text-brand-gradient text-sm font-extrabold">
                {progressPercent}%
              </p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-violet-100">
              <div
                className="h-full rounded-full bg-brand-gradient-90 transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {isComplete ? (
            <div className="px-5 py-10 sm:px-10 sm:py-14">
              <CompletionPanel
                role={role}
                isAuthenticated={isAuthenticated}
                isAuthLoading={isAuthLoading}
              />
            </div>
          ) : (
            <div className="grid gap-0 lg:grid-cols-[280px_1fr]">
              <StepNavRail
                steps={steps as OnboardingStepConfig[]}
                role={role}
                activeIndex={activeIndex}
                onStepSelect={setActiveIndex}
                ariaLabel={t("badge")}
              />

              <div className="px-5 py-6 sm:px-8 sm:py-8">
                <div
                  key={`${role}-${activeStep.id}`}
                  className="animate-in fade-in slide-in-from-right-4 duration-500 [animation-fill-mode:both]"
                >
                  <StepDetailPanel
                    step={activeStep}
                    role={role}
                    stepIndex={activeIndex}
                    actionHref={actionHref}
                    actionLabel={actionLabel}
                    tipLinks={tipLinks}
                    isOpening={isOpening}
                    onContactSupport={() => void openAdminSupportChat()}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3 sm:mt-8">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrev}
            disabled={!isComplete && activeIndex === 0}
            className="h-10 rounded-full border-slate-200 px-5 text-xs font-semibold text-slate-700 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 disabled:opacity-40 sm:text-sm"
          >
            <ArrowLeft className="mr-1 size-3.5" />
            {t("prev")}
          </Button>

          {!isComplete ? (
            <Button
              type="button"
              onClick={handleNext}
              className="group h-11 rounded-full bg-brand-gradient px-6 text-xs font-semibold text-white shadow-md shadow-violet-300/40 transition-all hover:shadow-lg hover:shadow-violet-400/50 sm:text-sm"
            >
              {activeIndex === steps.length - 1 ? t("finish") : t("next")}
              <ArrowRight className="ml-1 size-3.5 transition-transform group-hover:translate-x-0.5" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={resetToStart}
              variant="outline"
              className="h-11 rounded-full border-violet-200 px-6 text-xs font-semibold text-violet-700 hover:border-violet-300 hover:bg-violet-50 sm:text-sm"
            >
              {t("prev")}
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}
