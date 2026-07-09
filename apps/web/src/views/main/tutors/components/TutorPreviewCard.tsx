"use client";

import { ArrowRight, MousePointerClick, Star } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ECurrency,
  formatToCurrency,
  type VerifiedTutorProfileDto,
} from "@mezon-tutors/shared";
import { Button, Card, CardContent } from "@/components/ui";
import { useCurrency } from "@/hooks";
import VideoPreview from "./VideoPreview";

export default function TutorPreviewCard({
  tutor,
}: {
  tutor: VerifiedTutorProfileDto | null;
}) {
  const t = useTranslations("Tutors.PreviewCard");
  const { currency } = useCurrency();

  if (!tutor) {
    return (
      <Card className="overflow-hidden border-violet-100 bg-white py-0">
        <CardContent className="relative px-6 py-10">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-[linear-gradient(180deg,#faf7ff_0%,#ffffff_100%)]" />
            <div className="absolute -top-10 left-1/2 size-48 -translate-x-1/2 rounded-full bg-violet-200/40 blur-2xl" />
          </div>
          <div className="relative flex flex-col items-center text-center">
            <div className="relative mb-4">
              <div className="absolute inset-0 -z-10 animate-pulse rounded-2xl bg-[linear-gradient(135deg,#ede9fe,#fce7f3)] blur-xl" />
              <div className="flex size-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#ede9fe,#fce7f3)] ring-1 ring-violet-100">
                <MousePointerClick className="size-6 text-violet-600" />
              </div>
            </div>
            <p className="mb-1 text-sm font-bold text-slate-900">
              {t("selectTutor")}
            </p>
            <p className="text-xs text-slate-500">
              {t("hoverHint")}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const name = `${tutor.firstName} ${tutor.lastName}`.trim();
  const tutorPrices = (
    tutor as unknown as {
      prices?: {
        baseCurrency?: ECurrency;
        usd?: number;
        vnd?: number;
        php?: number;
      };
    }
  ).prices;
  const lessonPrice =
    currency === ECurrency.USD
      ? (tutorPrices?.usd ?? 0)
      : currency === ECurrency.PHP
        ? (tutorPrices?.php ?? 0)
        : (tutorPrices?.vnd ?? 0);

  return (
    <Card className="overflow-hidden border-slate-200 bg-white py-0">
      <CardContent className="space-y-3 p-3">
        <VideoPreview videoUrl={tutor.videoUrl} height={200} />

        <div className="flex items-center justify-between gap-3 px-1">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-slate-900">{name}</p>
            <div className="mt-0.5 flex items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-0.5 font-semibold text-amber-600">
                <Star className="size-3 fill-amber-400 text-amber-400" />
                {tutor.ratingAverage.toFixed(1)}
              </span>
              <span className="text-slate-300">·</span>
              <span className="font-semibold text-slate-700">
                {formatToCurrency(currency, lessonPrice)}
                <span className="font-normal text-slate-400">/h</span>
              </span>
            </div>
          </div>
        </div>

        <Link href={`/tutors/${tutor.id}`} className="block">
          <Button
            variant="outline"
            className="group h-9 w-full rounded-full border-slate-200 text-xs font-semibold text-slate-700 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
          >
            {t("seeProfile")}
            <ArrowRight className="ml-1 size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
