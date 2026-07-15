"use client";

import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calendar,
  Check,
  GraduationCap,
  Save,
  Sparkles,
  UserCircle,
  Video,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { useAtomValue } from "jotai";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { formatLastSavedTime, ROUTES } from "@mezon-tutors/shared";
import { Button } from "@/components/ui";
import { tutorProfileLastSavedAtAtom } from "@/store";
import { BecomeTutorRequiredNote } from "./BecomeTutorFormFields";
import { BecomeTutorCardPreview } from "./BecomeTutorCardPreview";

const STEPS = [
  { id: "about", number: 1, icon: UserCircle, accent: "from-violet-500 to-purple-500" },
  { id: "photo", number: 2, icon: Sparkles, accent: "from-purple-500 to-fuchsia-500" },
  { id: "certification", number: 3, icon: BookOpen, accent: "from-fuchsia-500 to-rose-500" },
  { id: "video", number: 4, icon: Video, accent: "from-rose-500 to-orange-500" },
  { id: "availability", number: 5, icon: Calendar, accent: "from-amber-500 to-rose-500" },
] as const;

type BecomeTutorShellProps = {
  headerTitle: string;
  saveExitLabel?: string;
  stepLabel: string;
  progressPercent: number;
  progressLabel: string;
  nextLabel: string;
  children: ReactNode;
  backLabel?: string;
  continueLabel: string;
  onBack?: () => void;
  onContinue: () => void;
  continueDisabled?: boolean;
  currentStep?: number;
  onSaveExit?: () => void | Promise<void>;
  saveExitHref?: string;
};

export function BecomeTutorShell({
  headerTitle,
  saveExitLabel,
  stepLabel,
  progressPercent,
  progressLabel,
  nextLabel,
  children,
  backLabel,
  continueLabel,
  onBack,
  onContinue,
  continueDisabled = false,
  currentStep,
  onSaveExit,
  saveExitHref = ROUTES.BECOME_TUTOR.INDEX,
}: BecomeTutorShellProps) {
  const tShell = useTranslations("BecomeTutor.shell");
  const tStepper = useTranslations("BecomeTutor.shell.stepper");
  const router = useRouter();
  const lastSavedAt = useAtomValue(tutorProfileLastSavedAtAtom);
  const [isSavingExit, setIsSavingExit] = useState(false);
  const activeStep = currentStep ?? Math.round(progressPercent / 20) + 1;

  const draftTime =
    lastSavedAt && formatLastSavedTime(lastSavedAt)
      ? formatLastSavedTime(lastSavedAt)
      : "";
  const draftSavedLabel = draftTime ? tShell("draftSaved", { time: draftTime }) : "";

  const exitLabel = saveExitLabel ?? tShell("saveExit");

  const handleSaveExit = async () => {
    setIsSavingExit(true);
    try {
      await onSaveExit?.();
      router.push(saveExitHref);
    } catch {
      /* ignore */
    } finally {
      setIsSavingExit(false);
    }
  };

  return (
    <main className="relative min-h-screen">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#faf7ff_0%,#ffffff_60%)]" />
        <div className="absolute -top-40 left-1/2 size-[44rem] -translate-x-1/2 rounded-full bg-violet-300/25 blur-[140px]" />
      </div>

      <div className="flex min-h-screen flex-col">
        <div className="flex-1 overflow-y-auto pb-24 md:pb-28">
          <div className="px-4 py-6 sm:px-6 md:py-8 lg:px-8">
            <div className="mx-auto flex w-full max-w-[960px] flex-col gap-5 md:gap-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-brand-gradient-135 text-white shadow-md shadow-violet-300/40">
                    <GraduationCap className="size-5" />
                  </div>
                  <div className="leading-tight">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-500">
                      {tShell("applicationEyebrow")}
                    </p>
                      <h1 className="text-base font-extrabold text-slate-900 sm:text-lg">
                        {headerTitle}
                      </h1>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {draftSavedLabel ? (
                    <p className="hidden items-center gap-1.5 text-xs text-slate-500 sm:inline-flex">
                      <span className="size-1.5 rounded-full bg-emerald-500" />
                      {draftSavedLabel}
                    </p>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSavingExit}
                    onClick={() => void handleSaveExit()}
                    className="h-9 rounded-full border-slate-200 px-4 text-xs font-semibold text-slate-700 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 disabled:opacity-60"
                  >
                    <Save className="mr-1 size-3.5" />
                    {isSavingExit ? tShell("savingExit") : exitLabel}
                  </Button>
                </div>
              </div>

              <div className="rounded-2xl border border-violet-100 bg-white/80 px-4 py-4 shadow-sm shadow-violet-100/40 backdrop-blur sm:px-6 sm:py-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-700 sm:text-xs">
                    {stepLabel}
                  </p>
                  <p className="text-brand-gradient text-xs font-extrabold sm:text-sm">
                    {progressLabel}
                  </p>
                </div>

                <div className="relative flex items-center justify-between gap-1 sm:gap-2">
                  {STEPS.map((step, index) => {
                    const Icon = step.icon;
                    const isCompleted = step.number < activeStep;
                    const isActive = step.number === activeStep;
                    const isLast = index === STEPS.length - 1;

                    return (
                      <div
                        key={step.id}
                        className="relative flex flex-1 flex-col items-center gap-1.5"
                      >
                        {!isLast ? (
                          <span
                            aria-hidden
                            className={`pointer-events-none absolute top-4 left-1/2 right-[-50%] h-[2px] -translate-y-1/2 ${
                              isCompleted
                                ? "bg-brand-gradient-90"
                                : "bg-violet-100"
                            }`}
                            style={{ width: "100%" }}
                          />
                        ) : null}

                        <div
                          className={`relative z-10 flex size-8 items-center justify-center rounded-full text-xs font-extrabold transition-all sm:size-9 ${
                            isActive
                              ? `bg-gradient-to-br ${step.accent} text-white shadow-md shadow-violet-300/50 ring-4 ring-violet-100`
                              : isCompleted
                                ? "bg-brand-gradient-135 text-white shadow-sm shadow-violet-300/40"
                                : "bg-white text-slate-400 ring-1 ring-slate-200"
                          }`}
                        >
                          {isCompleted ? (
                            <Check className="size-4" strokeWidth={3} />
                          ) : isActive ? (
                            <Icon className="size-4" />
                          ) : (
                            <span>{step.number}</span>
                          )}
                        </div>

                        <span
                          className={`text-center text-[10px] font-semibold leading-tight transition-colors sm:text-[11px] ${
                            isActive
                              ? "text-violet-700"
                              : isCompleted
                                ? "text-slate-700"
                                : "text-slate-400"
                          }`}
                        >
                          {tStepper(step.id)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 space-y-3 border-t border-violet-100 pt-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-violet-100">
                      <div
                        className="h-full rounded-full bg-brand-gradient-90 transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <p className="shrink-0 text-[11px] font-medium text-slate-500 sm:text-xs">
                      {nextLabel}
                    </p>
                  </div>
                </div>
              </div>
              {children}
              {activeStep === 1 ? (
                <div className="rounded-2xl border border-dashed border-violet-200 bg-violet-50/40 p-4 shadow-sm shadow-violet-100/20 sm:p-5">
                  <div className="mb-4 space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-500">
                      {tShell("preview.eyebrow")}
                    </p>
                    <p className="text-sm font-extrabold text-slate-900 sm:text-base">
                      {tShell("preview.title")}
                    </p>
                    <p className="text-xs leading-5 text-slate-500 sm:text-sm">
                      {tShell("preview.hint")}
                    </p>
                  </div>
                  <BecomeTutorCardPreview />
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 left-0 right-0 z-10 border-t border-violet-100 bg-white/90 py-3 shadow-[0_-8px_30px_-12px_rgba(91,33,182,0.18)] backdrop-blur sm:py-4">
          <div className="mx-auto w-full max-w-[960px] px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-3">
              {onBack ? (
                <Button
                  variant="outline"
                  onClick={onBack}
                  className="h-10 rounded-full border-slate-200 px-5 text-xs font-semibold text-slate-700 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 sm:text-sm"
                >
                  <ArrowLeft className="mr-1 size-3.5" />
                  {backLabel ?? tShell("back")}
                </Button>
              ) : (
                <span />
              )}
              <Button
                size="lg"
                onClick={onContinue}
                disabled={continueDisabled}
                variant="gradient"
                className="group h-11 rounded-full px-6 text-xs font-semibold"
              >
                {continueLabel}
                <ArrowRight className="ml-1 size-3.5 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

type SectionProps = {
  eyebrow?: string;
  title?: string;
  description?: string;
  isShowNote?: boolean;
  children: ReactNode;
  className?: string;
  contentRef?: React.Ref<HTMLDivElement>;
};

export function BecomeTutorSection({
  eyebrow,
  title,
  description,
  isShowNote = false,
  children,
  className,
  contentRef,
}: SectionProps) {
  return (
    <div
      ref={contentRef}
      className={`min-w-0 rounded-3xl border border-violet-100 bg-white p-5 shadow-sm shadow-violet-100/40 sm:p-6 ${className ?? ""}`}
    >
      {title || eyebrow || description ? (
        <div className="mb-5 space-y-1">
          {eyebrow ? (
            <div className="flex justify-between items-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-500">
                {eyebrow}
              </p>
              {isShowNote && <BecomeTutorRequiredNote variant="chip" />}
            </div>
          ) : null}
          {title ? (
            <h2 className="text-lg font-extrabold text-slate-900 sm:text-xl">
              {title}
            </h2>
          ) : null}
          {description ? (
            <p className="text-xs leading-5 text-slate-500 sm:text-sm sm:leading-6">
              {description}
            </p>
          ) : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}
