"use client";

import { Card, CardContent } from "@/components/ui";
import { useTranslations } from "next-intl";

const SEAMLESS_FEATURES = [
  { key: "virtualClassroom", icon: "🧑‍🏫" },
  { key: "instantMessaging", icon: "⚡" },
] as const;

export default function HomeSeamlessSection() {
  const t = useTranslations("Home.Seamless");

  return (
    <section className="bg-violet-50 py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">{t("title")}</h2>
          <p className="mt-3 text-slate-600">{t("description")}</p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {SEAMLESS_FEATURES.map((feature) => (
            <Card key={feature.key} className="rounded-2xl border-violet-100 bg-white py-0 shadow-sm shadow-violet-100/60">
              <CardContent className="flex gap-4 p-6">
                <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xl">{feature.icon}</div>
                <div>
                  <h3 className="mb-1 text-lg font-semibold text-slate-900">{t(`${feature.key}.title`)}</h3>
                  <p className="text-sm leading-6 text-slate-600">{t(`${feature.key}.description`)}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
