"use client";

import {
  MessagesSquare,
  Moon,
  ShieldCheck,
  Target,
  Undo2,
  Wallet,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui";

const FEATURES = [
  { key: "evening", icon: Moon, accent: "bg-violet-100 text-violet-700" },
  {
    key: "payPerLesson",
    icon: Wallet,
    accent: "bg-fuchsia-100 text-fuchsia-700",
  },
  {
    key: "verified",
    icon: ShieldCheck,
    accent: "bg-purple-100 text-purple-700",
  },
  {
    key: "mezon",
    icon: MessagesSquare,
    accent: "bg-violet-100 text-violet-700",
    highlight: true,
  },
  { key: "personalized", icon: Target, accent: "bg-rose-100 text-rose-700" },
  { key: "moneyBack", icon: Undo2, accent: "bg-indigo-100 text-indigo-700" },
] as const;

export default function HomeWhyUsSection() {
  const t = useTranslations("Home.WhyUs");

  return (
    <section className="relative bg-violet-50/60 py-20 sm:py-28">
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

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            const isHighlight = "highlight" in feature && feature.highlight;
            return (
              <div
                key={feature.key}
                className={`group relative overflow-hidden rounded-3xl border p-7 transition-all hover:-translate-y-1 ${
                  isHighlight
                    ? "border-violet-300 bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 text-white shadow-xl shadow-violet-300/40"
                    : "border-violet-100 bg-white shadow-sm hover:shadow-lg hover:shadow-violet-200/50"
                }`}
              >
                {isHighlight ? (
                  <>
                    <div className="pointer-events-none absolute -top-12 -right-12 size-40 rounded-full bg-white/20 blur-2xl" />
                    <div
                      className="pointer-events-none absolute inset-0 opacity-[0.07]"
                      style={{
                        backgroundImage:
                          "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
                        backgroundSize: "20px 20px",
                      }}
                    />
                  </>
                ) : null}
                <div
                  className={`mb-5 inline-flex size-12 items-center justify-center rounded-2xl ${
                    isHighlight ? "bg-white/15 text-white" : feature.accent
                  }`}
                >
                  <Icon className="size-6" />
                </div>
                <h3
                  className={`mb-2 text-lg font-bold ${isHighlight ? "text-white" : "text-slate-900"}`}
                >
                  {t(`items.${feature.key}.title`)}
                </h3>
                <p
                  className={`text-sm leading-6 ${isHighlight ? "text-white/85" : "text-slate-600"}`}
                >
                  {t(`items.${feature.key}.description`)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
