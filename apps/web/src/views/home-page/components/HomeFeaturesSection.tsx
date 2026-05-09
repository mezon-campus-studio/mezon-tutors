"use client";

import { Button, Card, CardContent } from "@/components/ui";
import { useTranslations } from "next-intl";

const FEATURES = [
  { key: "eveningClasses", icon: "🌙" },
  { key: "flexibleWeekends", icon: "📅" },
  { key: "learnViaMezon", icon: "💬" },
] as const;

export default function HomeFeaturesSection() {
  const t = useTranslations("Home.Features");

  return (
    <section className="bg-violet-50 py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="mb-12 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl space-y-3">
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">{t("title")}</h2>
            <p className="text-slate-600">{t("description")}</p>
          </div>
          <Button variant="outline" className="w-fit rounded-full px-5 text-sm font-semibold">
            {t("exploreAll")} →
          </Button>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {FEATURES.map((feature) => (
            <Card key={feature.key} className="rounded-2xl border-violet-100 bg-white py-0 shadow-sm shadow-violet-100/60">
              <CardContent className="p-6">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 text-xl">{feature.icon}</div>
                <h3 className="mb-2 text-xl font-semibold text-slate-900">{t(`${feature.key}.title`)}</h3>
                <p className="text-sm leading-6 text-slate-600">{t(`${feature.key}.description`)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
