"use client";

import Image from "next/image";
import { Badge, Button, Card, CardContent } from "@/components/ui";
import tutorImage from "@/public/images/tutor.png";
import { useTranslations } from "next-intl";

export default function HomeHeroSection() {
  const t = useTranslations("Home.Hero");

  return (
    <section className="relative overflow-hidden bg-white">
      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-violet-200/60 blur-3xl" />
      <div className="absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-purple-200/60 blur-3xl" />

      <div className="mx-auto grid min-h-[calc(100vh-80px)] max-w-7xl grid-cols-1 items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:px-10">
        <div className="space-y-6">
          <Badge className="h-auto rounded-full border border-violet-200 bg-violet-100 px-4 py-1.5 text-sm font-semibold text-violet-700">
            ⚡ {t("badge")}
          </Badge>
          <h1 className="text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl lg:text-6xl">
            {t("title")}
            <span className="block text-violet-600">{t("titleHighlight")}</span>
          </h1>
          <p className="max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
            {t("description")}
          </p>
          <div className="flex flex-wrap gap-4">
            <Button className="rounded-full px-6 text-sm font-semibold">
              {t("startNow")}
            </Button>
            <Button variant="outline" className="rounded-full px-6 text-sm font-semibold">
              {t("watchDemo")}
            </Button>
          </div>
        </div>

        <Card className="mx-auto w-full max-w-md rounded-3xl border-violet-100 bg-white p-3 shadow-xl shadow-violet-200/40">
          <CardContent className="relative overflow-hidden rounded-2xl p-0">
            <Image
              src={tutorImage}
              alt="Tutor card"
              width={480}
              height={620}
              className="h-[520px] w-full object-cover"
              priority
            />
            <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent p-5 text-white">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold">
                <span className="rounded-full bg-white/20 px-3 py-1">98% {t("match")}</span>
                <span className="rounded-full bg-white/20 px-3 py-1">⭐ 4.9</span>
              </div>
              <h3 className="text-2xl font-bold">Ha Linh</h3>
              <p className="mt-1 text-sm text-white/90">IELTS Mentor - 6 nam kinh nghiem day 1-1.</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button variant="outline" className="rounded-xl border-white/30 bg-white/10 text-sm font-medium text-white hover:bg-white/20 hover:text-white">
                  {t("profile")}
                </Button>
                <Button className="rounded-xl text-sm font-semibold">{t("connect")}</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
