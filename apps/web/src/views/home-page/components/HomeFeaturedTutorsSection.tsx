"use client";

import { ArrowRight, Star } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Badge, Button } from "@/components/ui";

const TUTORS = [
  {
    key: "tutor1",
    flag: "🇻🇳",
    rate: "$15",
    rating: 5.0,
    lessons: 1240,
    tags: ["ielts", "conversation"],
    gradient: "from-violet-500 via-purple-500 to-fuchsia-500",
    initials: "LP",
  },
  {
    key: "tutor2",
    flag: "🇬🇧",
    rate: "$24",
    rating: 4.9,
    lessons: 980,
    tags: ["business", "conversation"],
    gradient: "from-indigo-500 via-violet-500 to-purple-500",
    initials: "JO",
  },
  {
    key: "tutor3",
    flag: "🇺🇸",
    rate: "$20",
    rating: 5.0,
    lessons: 760,
    tags: ["toeic", "conversation"],
    gradient: "from-fuchsia-500 via-rose-500 to-orange-500",
    initials: "EW",
  },
  {
    key: "tutor4",
    flag: "🇦🇺",
    rate: "$18",
    rating: 4.9,
    lessons: 540,
    tags: ["conversation", "kids"],
    gradient: "from-purple-500 via-fuchsia-500 to-rose-500",
    initials: "DB",
  },
] as const;

export default function HomeFeaturedTutorsSection() {
  const t = useTranslations("Home.FeaturedTutors");

  return (
    <section className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="mb-12 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl space-y-3">
            <Badge className="h-auto rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
              {t("badge")}
            </Badge>
            <h2 className="text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
              {t("title")}
            </h2>
            <p className="text-slate-600">{t("description")}</p>
          </div>
          <Link href="/tutors">
            <Button
              variant="outline"
              className="h-10 w-fit rounded-full px-5 text-sm font-semibold"
            >
              {t("viewAll")}
              <ArrowRight className="ml-1 size-4" />
            </Button>
          </Link>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {TUTORS.map((tutor) => (
            <article
              key={tutor.key}
              className="group flex flex-col overflow-hidden rounded-3xl border border-violet-100 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-violet-200/50"
            >
              <div
                className={`relative h-36 bg-gradient-to-br ${tutor.gradient}`}
              >
                <div
                  className="absolute inset-0 opacity-30"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
                    backgroundSize: "16px 16px",
                  }}
                />
                <div className="absolute inset-x-4 -bottom-10 flex items-end justify-between">
                  <div className="flex size-20 items-center justify-center rounded-2xl border-4 border-white bg-white text-2xl font-extrabold text-violet-700 shadow-lg">
                    {tutor.initials}
                  </div>
                  <span className="mb-2 rounded-full border border-white/60 bg-white/90 px-2.5 py-1 text-xs font-semibold text-slate-700 shadow backdrop-blur">
                    <span className="mr-1">{tutor.flag}</span>
                    {t(`list.${tutor.key}.country`)}
                  </span>
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-3 p-5 pt-12">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 transition-colors group-hover:text-violet-700">
                    {t(`list.${tutor.key}.name`)}
                  </h3>
                  <p className="text-xs leading-5 text-slate-500">
                    {t(`list.${tutor.key}.title`)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {tutor.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-violet-50 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700"
                    >
                      {t(`tags.${tag}`)}
                    </span>
                  ))}
                </div>

                <div className="mt-auto flex items-center justify-between border-t border-violet-50 pt-3">
                  <div className="flex items-center gap-3 text-xs">
                    <span className="inline-flex items-center gap-1 font-semibold text-amber-600">
                      <Star className="size-3.5 fill-amber-400 text-amber-400" />
                      {tutor.rating.toFixed(1)}
                    </span>
                    <span className="text-slate-400">
                      {tutor.lessons} {t("lessons")}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-extrabold text-slate-900 leading-none">
                      {tutor.rate}
                    </p>
                    <p className="text-[10px] font-medium text-slate-500">
                      {t("perHour")}
                    </p>
                  </div>
                </div>

                <Button className="h-9 w-full rounded-full bg-violet-600 text-xs font-semibold text-white hover:bg-violet-700">
                  {t("bookTrial")}
                  <ArrowRight className="ml-1 size-3.5" />
                </Button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
