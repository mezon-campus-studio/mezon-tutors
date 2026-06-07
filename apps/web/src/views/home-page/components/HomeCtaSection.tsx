"use client";

import { ArrowRight, GraduationCap, Sparkles } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Badge, Button } from "@/components/ui";

export default function HomeCtaSection() {
  const t = useTranslations("Home.Cta");

  return (
    <section className="bg-white py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="relative overflow-hidden rounded-[2.5rem] border border-violet-200 bg-gradient-to-br from-violet-700 via-purple-700 to-fuchsia-700 px-8 py-14 text-white shadow-2xl shadow-violet-400/40 sm:px-14 sm:py-20">
          <div className="pointer-events-none absolute -top-32 -left-24 size-[28rem] rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -right-24 size-[32rem] rounded-full bg-fuchsia-300/20 blur-3xl" />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
              backgroundSize: "26px 26px",
            }}
          />

          <div className="pointer-events-none absolute right-10 top-10 hidden h-24 w-24 rotate-12 rounded-3xl bg-white/10 backdrop-blur md:block" />
          <div className="pointer-events-none absolute bottom-12 left-12 hidden h-20 w-20 -rotate-12 rounded-2xl bg-white/10 backdrop-blur md:block" />

          <div className="relative mx-auto max-w-3xl text-center">
            <Badge className="mx-auto h-auto rounded-full border border-white/30 bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
              <Sparkles className="mr-1.5 size-3.5" />
              {t("badge")}
            </Badge>
            <h2 className="mt-5 text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl">
              {t("title")}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-white/80 sm:text-lg">
              {t("description")}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/tutors" className="w-full sm:w-auto">
                <Button className="h-12 w-full rounded-full bg-white px-6 text-sm font-semibold text-violet-700 shadow-lg hover:bg-violet-50 sm:w-auto">
                  {t("primary")}
                  <ArrowRight className="ml-1 size-4" />
                </Button>
              </Link>
              <Link href="/become-tutor" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  className="h-12 w-full rounded-full border-white/40 bg-white/10 px-6 text-sm font-semibold text-white hover:bg-white/20 hover:text-white sm:w-auto"
                >
                  <GraduationCap className="mr-1.5 size-4" />
                  {t("secondary")}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
