"use client";

import { Calendar, GraduationCap, Star, Users } from "lucide-react";
import { useTranslations } from "next-intl";

const STATS = [
  { key: "tutors", icon: GraduationCap },
  { key: "students", icon: Users },
  { key: "lessons", icon: Calendar },
  { key: "rating", icon: Star },
] as const;

export default function HomeStatsSection() {
  const t = useTranslations("Home.Stats");

  return (
    <section className="relative -mt-12 px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="relative overflow-hidden rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 p-8 text-white shadow-2xl shadow-violet-300/40 sm:p-10">
          <div className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 size-72 rounded-full bg-fuchsia-300/30 blur-3xl" />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
              backgroundSize: "24px 24px",
            }}
          />

          <div className="relative grid gap-8 md:grid-cols-2 md:items-end md:gap-12">
            <div className="max-w-xl">
              <h2 className="text-2xl font-bold leading-tight sm:text-3xl">
                {t("title")}
              </h2>
              <p className="mt-2 text-sm leading-6 text-white/80 sm:text-base">
                {t("description")}
              </p>
            </div>
            <dl className="grid grid-cols-2 gap-6 sm:grid-cols-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
              {STATS.map(({ key, icon: Icon }) => (
                <div key={key} className="space-y-1">
                  <div className="inline-flex size-10 items-center justify-center rounded-full bg-white/15 backdrop-blur">
                    <Icon className="size-5" />
                  </div>
                  <dt className="text-2xl font-extrabold sm:text-3xl">
                    {t(`items.${key}.value`)}
                  </dt>
                  <dd className="text-xs font-medium text-white/70 sm:text-sm">
                    {t(`items.${key}.label`)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
