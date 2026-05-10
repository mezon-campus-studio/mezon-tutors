"use client";

import { Quote, Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui";

const TESTIMONIALS = [
  {
    key: "review1",
    accent: "from-violet-500 to-purple-500",
    initials: "TN",
  },
  {
    key: "review2",
    accent: "from-purple-500 to-fuchsia-500",
    initials: "HL",
  },
  {
    key: "review3",
    accent: "from-fuchsia-500 to-rose-500",
    initials: "PV",
  },
] as const;

export default function HomeTestimonialsSection() {
  const t = useTranslations("Home.Testimonials");

  return (
    <section className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="mx-auto mb-14 max-w-2xl space-y-3 text-center">
          <Badge className="mx-auto h-auto rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
            {t("badge")}
          </Badge>
          <h2 className="text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
            {t("title")}
          </h2>
          <p className="text-slate-600">{t("description")}</p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {TESTIMONIALS.map((review, index) => (
            <figure
              key={review.key}
              className={`relative flex flex-col gap-5 rounded-3xl border border-violet-100 bg-white p-7 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-violet-200/50 ${
                index === 1 ? "md:translate-y-4" : ""
              }`}
            >
              <Quote className="size-7 text-violet-200" />
              <blockquote className="text-sm leading-7 text-slate-700">
                &ldquo;{t(`items.${review.key}.quote`)}&rdquo;
              </blockquote>
              <div className="flex gap-0.5">
                {["s1", "s2", "s3", "s4", "s5"].map((id) => (
                  <Star
                    key={id}
                    className="size-4 fill-amber-400 text-amber-400"
                  />
                ))}
              </div>
              <figcaption className="mt-auto flex items-center gap-3 border-t border-violet-50 pt-4">
                <div
                  className={`flex size-11 items-center justify-center rounded-full bg-gradient-to-br ${review.accent} text-sm font-bold text-white shadow-md`}
                >
                  {review.initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {t(`items.${review.key}.name`)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {t(`items.${review.key}.role`)}
                  </p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
