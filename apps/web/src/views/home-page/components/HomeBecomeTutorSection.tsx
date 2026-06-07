"use client";

import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Badge, Button, Card, CardContent } from "@/components/ui";
import teachImage from "@/public/images/teach.jpg";

const BENEFIT_KEYS = [
  { key: "payment", icon: Wallet },
  { key: "tools", icon: Sparkles },
  { key: "schedule", icon: CalendarClock },
] as const;

export default function HomeBecomeTutorSection() {
  const t = useTranslations("Home.BecomeTutor");

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 py-12 sm:py-16">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 right-1/4 size-96 rounded-full bg-violet-300/30 blur-3xl" />
        <div className="absolute -bottom-32 left-1/4 size-96 rounded-full bg-fuchsia-300/30 blur-3xl" />
      </div>

      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-6 lg:grid-cols-2 lg:px-10">
        <div className="relative">
          <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-gradient-to-br from-violet-200 via-fuchsia-200 to-purple-200 opacity-70 blur-2xl" />

          <Card className="overflow-hidden rounded-[2.4rem] border-violet-100 bg-white py-0 shadow-2xl shadow-violet-300/40">
            <CardContent className="p-0">
              <Image
                src={teachImage}
                alt="Become tutor"
                width={720}
                height={520}
                className="h-[440px] w-full object-cover sm:h-[520px]"
              />
            </CardContent>
          </Card>

          <div className="absolute -left-3 top-6 rounded-2xl border border-violet-100 bg-white/95 px-4 py-3 shadow-xl shadow-violet-200/40 backdrop-blur sm:left-6">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-md">
                <Wallet className="size-5" />
              </div>
              <div>
                <p className="text-xl font-extrabold text-violet-700 leading-none">
                  {t("badgeAmount")}
                </p>
                <p className="text-[11px] text-slate-500">{t("badgeLabel")}</p>
              </div>
            </div>
          </div>

          <div className="absolute bottom-6 right-3 rounded-2xl border border-violet-100 bg-white/95 px-4 py-3 shadow-xl shadow-violet-200/40 backdrop-blur sm:right-6">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <TrendingUp className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">+38%</p>
                <p className="text-[11px] text-slate-500">
                  Bookings this month
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <Badge className="h-auto rounded-full border border-violet-200 bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
            For tutors
          </Badge>
          <h2 className="text-3xl font-bold leading-tight text-slate-900 sm:text-4xl lg:text-5xl">
            {t("title")}{" "}
            <span className="bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
              {t("titleHighlight")}
            </span>
          </h2>
          <p className="text-base leading-7 text-slate-600">
            {t("description")}
          </p>
          <ul className="grid gap-3">
            {BENEFIT_KEYS.map(({ key, icon: Icon }) => (
              <li
                key={key}
                className="flex items-start gap-3 rounded-2xl border border-violet-100 bg-white/80 p-4 backdrop-blur"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                  <Icon className="size-4" />
                </div>
                <div className="flex flex-1 items-start gap-2 text-sm font-medium text-slate-700">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-violet-600" />
                  <span>{t(`benefits.${key}`)}</span>
                </div>
              </li>
            ))}
          </ul>
          <Link href="/become-tutor">
            <Button className="h-11 w-fit rounded-full bg-violet-600 px-6 text-sm font-semibold text-white hover:bg-violet-700">
              {t("registerButton")}
              <ArrowRight className="ml-1 size-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
