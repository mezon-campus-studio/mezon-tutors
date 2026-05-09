"use client";

import Image from "next/image";
import Link from "next/link";
import { Badge, Button, Card, CardContent } from "@/components/ui";
import teachImage from "@/public/images/teach.jpg";
import { useTranslations } from "next-intl";

const BENEFIT_KEYS = ["payment", "tools", "schedule"] as const;

export default function HomeBecomeTutorSection() {
  const t = useTranslations("Home.BecomeTutor");

  return (
    <section className="bg-white py-16 sm:py-24">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-6 lg:grid-cols-2 lg:px-10">
        <div className="relative">
          <Card className="rounded-3xl border-violet-100 py-0 shadow-lg shadow-violet-200/40">
            <CardContent className="p-0">
              <Image
                src={teachImage}
                alt="Become tutor"
                width={640}
                height={420}
                className="w-full rounded-3xl object-cover"
              />
            </CardContent>
          </Card>
          <Badge className="absolute left-4 top-4 h-auto rounded-2xl border border-violet-200 bg-white/90 px-4 py-3 backdrop-blur">
            <p className="text-2xl font-extrabold text-violet-600">{t("badgeAmount")}</p>
            <p className="text-xs text-slate-500">{t("badgeLabel")}</p>
          </Badge>
        </div>

        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-slate-900 sm:text-5xl">
            {t("title")}
            <span className="block text-violet-600">{t("titleHighlight")}</span>
          </h2>
          <p className="text-slate-600">
            {t("description")}
          </p>
          <ul className="space-y-3">
            {BENEFIT_KEYS.map((benefitKey) => (
              <li key={benefitKey} className="flex items-center gap-3 text-slate-700">
                <span className="h-2.5 w-2.5 rounded-full bg-violet-600" />
                <span>{t(`benefits.${benefitKey}`)}</span>
              </li>
            ))}
          </ul>
          <Link href="/become-tutor">
            <Button className="w-fit rounded-full px-6 text-sm font-semibold">
              {t("registerButton")}
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
