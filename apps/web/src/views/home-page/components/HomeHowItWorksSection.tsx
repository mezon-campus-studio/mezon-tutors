"use client";

import { CalendarCheck, Search, Video } from "lucide-react";
import { useTranslations } from "next-intl";

const STEPS = [
  { key: "step1", icon: Search },
  { key: "step2", icon: CalendarCheck },
  { key: "step3", icon: Video },
] as const;

export default function HomeHowItWorksSection() {
  const t = useTranslations("Home.HowItWorks");

  return (
    <section id="how-it-works" className="scroll-mt-24 pt-8">
      <div className="mx-auto w-full max-w-7xl px-3 sm:px-4 lg:px-8">
        <div className="rounded-2xl border border-brand-100/70 bg-slate-50 px-5 py-6 sm:px-7 sm:py-7">
          <h2 className="mb-5 text-xl font-semibold tracking-tight text-slate-900">
            {t("title")}
          </h2>
          <ol className="grid gap-3 md:grid-cols-3 md:gap-6">
            {STEPS.map(({ key, icon: Icon }, index) => (
              <li
                key={key}
                className="relative flex items-start gap-4 rounded-xl border border-slate-200/80 bg-white p-5"
              >
                <span
                  aria-hidden="true"
                  className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-brand-100 bg-brand-50 text-brand-700"
                >
                  <Icon className="size-5" strokeWidth={1.75} />
                </span>
                <span
                  aria-hidden="true"
                  className="absolute top-5 right-5 font-mono text-xs font-medium text-slate-400"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 pt-0.5">
                  <h3 className="pr-6 text-base font-semibold text-slate-900">
                    {t(`steps.${key}.title`)}
                  </h3>
                  <p className="mt-1.5 text-base leading-6 text-slate-600">
                    {t(`steps.${key}.description`)}
                  </p>
                </div>
                {index < STEPS.length - 1 ? (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute top-10 left-full hidden w-6 border-t border-dashed border-brand-200 md:block"
                  />
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
