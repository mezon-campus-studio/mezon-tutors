"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import type { OnboardingRole, OnboardingStepConfig } from "@mezon-tutors/shared";
import { ONBOARDING_ICON_BY_KEY } from "./onboarding-icons";

type StepNavRailProps = {
  steps: OnboardingStepConfig[];
  role: OnboardingRole;
  activeIndex: number;
  onStepSelect: (index: number) => void;
  ariaLabel: string;
};

export function StepNavRail({
  steps,
  role,
  activeIndex,
  onStepSelect,
  ariaLabel,
}: StepNavRailProps) {
  const t = useTranslations("Onboarding");

  return (
    <div className="border-b border-violet-100 bg-violet-50/40 px-4 py-5 sm:px-6 lg:border-b-0 lg:border-r">
      <nav aria-label={ariaLabel} className="space-y-1">
        {steps.map((step, index) => {
          const Icon = ONBOARDING_ICON_BY_KEY[step.iconKey];
          const isActive = index === activeIndex;
          const isDone = index < activeIndex;

          return (
            <button
              key={step.id}
              type="button"
              onClick={() => onStepSelect(index)}
              className={`group flex w-full cursor-pointer items-center gap-3 rounded-2xl px-3 py-3 text-left transition-all duration-300 ${
                isActive
                  ? "bg-white shadow-md shadow-violet-200/50 ring-1 ring-violet-100"
                  : "hover:bg-white/70"
              }`}
            >
              <div
                className={`flex size-9 shrink-0 items-center justify-center rounded-xl text-xs font-extrabold transition-all ${
                  isActive
                    ? `bg-gradient-to-br ${step.accent} text-white shadow-md shadow-violet-300/40`
                    : isDone
                      ? "bg-brand-gradient-135 text-white"
                      : "bg-white text-slate-400 ring-1 ring-slate-200"
                }`}
              >
                {isDone ? (
                  <Check className="size-4" strokeWidth={3} />
                ) : isActive ? (
                  <Icon className="size-4" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={`truncate text-sm font-bold transition-colors ${
                    isActive
                      ? "text-violet-800"
                      : isDone
                        ? "text-slate-700"
                        : "text-slate-500"
                  }`}
                >
                  {t(`${role}.steps.${step.id}.title`)}
                </p>
                {isActive ? (
                  <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-500">
                    {t("stepBadge", { step: index + 1 })}
                  </p>
                ) : null}
              </div>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
