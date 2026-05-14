"use client";

import { CalendarCheck, Search, Video } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui";

const STEPS = [
  { key: "step1", icon: Search, accent: "from-violet-500 to-purple-500" },
  {
    key: "step2",
    icon: CalendarCheck,
    accent: "from-purple-500 to-fuchsia-500",
  },
  { key: "step3", icon: Video, accent: "from-fuchsia-500 to-rose-500" },
] as const;

export default function HomeHowItWorksSection() {
  const t = useTranslations("Home.HowItWorks");

  return (
    <section
      id="how-it-works"
      className="relative scroll-mt-24 bg-violet-50/60 py-20 sm:py-28"
    >
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 size-96 rounded-full bg-violet-200/40 blur-3xl" />
      </div>
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="mx-auto mb-14 max-w-2xl space-y-3 text-center">
          <Badge className="mx-auto h-auto rounded-full border border-violet-200 bg-white px-3 py-1 text-xs font-semibold text-violet-700">
            {t("badge")}
          </Badge>
          <h2 className="text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
            {t("title")}
          </h2>
          <p className="text-slate-600">{t("description")}</p>
        </div>

        <div className="relative grid gap-6 md:grid-cols-3 md:gap-8">
          <div className="pointer-events-none absolute inset-x-12 top-12 hidden h-px md:block">
            <div className="h-px w-full bg-gradient-to-r from-violet-300 via-fuchsia-300 to-rose-300" />
          </div>

          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={step.key}
                className="relative rounded-3xl border border-violet-100 bg-white p-7 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-violet-200/50"
              >
                <div className="absolute -top-4 right-6 rounded-full bg-white px-3 py-1 text-xs font-bold text-violet-600 shadow-md ring-1 ring-violet-100">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div
                  className={`mb-5 inline-flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br ${step.accent} text-white shadow-lg shadow-violet-300/40`}
                >
                  <Icon className="size-7" />
                </div>
                <h3 className="mb-2 text-xl font-bold text-slate-900">
                  {t(`steps.${step.key}.title`)}
                </h3>
                <p className="text-sm leading-6 text-slate-600">
                  {t(`steps.${step.key}.description`)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
