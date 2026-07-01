"use client";

import type { CSSProperties } from "react";
import {
  ECurrency,
  ESubject,
  ETutorSortBy,
  formatToCurrency,
  ROUTES,
  type VerifiedTutorProfileDto,
} from "@mezon-tutors/shared";
import { ArrowRight, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAtomValue } from "jotai";
import { Badge, Button } from "@/components/ui";
import { useCurrency } from "@/hooks";
import { useGetVerifiedTutors } from "@/services/tutor-profile/tutor-profile.api";
import { FeaturedTutorCard, FEATURED_GRADIENTS } from "@/components/common/FeaturedTutorCard";


export default function HomeFeaturedTutorsSection() {
  const t = useTranslations("Home.FeaturedTutors");
  const { currency } = useCurrency();
  const { data, isPending, isError } = useGetVerifiedTutors(1, 4, {
    sortBy: ETutorSortBy.POPULARITY,
    currency,
  });

  const featuredTutors = data?.items ?? [];

  if (isPending || isError || featuredTutors.length === 0) {
    return null;
  }

  return (
    <section className="bg-white py-8 sm:py-12">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between sm:mb-10">
          <div className="space-y-3">
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
              variant="gradient"
              className="h-10 w-fit rounded-full px-5 text-sm font-semibold"
            >
              {t("viewAll")}
              <ArrowRight className="ml-1 size-4" />
            </Button>
          </Link>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featuredTutors.map((tutor, index) => (
            <FeaturedTutorCard
              key={tutor.id}
              tutor={tutor}
              gradient={FEATURED_GRADIENTS[index % FEATURED_GRADIENTS.length]}
              currency={currency}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
