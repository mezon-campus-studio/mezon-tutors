"use client";

import { useTranslations } from "next-intl";
import { ECountry, ESubject, ETutorSortBy, TutorAboutDto } from "@mezon-tutors/shared";
import { useCurrency } from "@/hooks";
import { useGetVerifiedTutors } from "@/services/tutor-profile/tutor-profile.api";
import { Skeleton } from "@/components/ui";
import { FeaturedTutorCard, FEATURED_GRADIENTS } from "@/components/common/FeaturedTutorCard";

type SimilarTutorsSectionProps = {
  tutor: TutorAboutDto;
};

export function SimilarTutorsSection({ tutor }: SimilarTutorsSectionProps) {
  const t = useTranslations("Tutors.Detail");
  const { currency } = useCurrency();

  const { data, isPending, isError } = useGetVerifiedTutors(1, 5, {
    sortBy: ETutorSortBy.BEST_RATING,
    subject: tutor.subject as ESubject,
    country: tutor.country as ECountry,
    currency,
  });

  const similarTutors = (data?.items ?? []).filter((item) => item.id !== tutor.id).slice(0, 4);

  if (isPending || isError) {
    if (isError) return null;
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-6">
        <Skeleton className="mb-6 h-6 w-48" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-3 rounded-xl border border-gray-100 p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="size-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="mt-2 h-9 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (similarTutors.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6">
      <h3 className="mb-6 text-xl font-bold text-gray-900">
        {t("youMightAlsoLike")}
      </h3>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {similarTutors.map((similarTutor, index) => (
          <FeaturedTutorCard
            key={similarTutor.id}
            tutor={similarTutor}
            gradient={FEATURED_GRADIENTS[index % FEATURED_GRADIENTS.length]}
            currency={currency}
          />
        ))}
      </div>
    </section>
  );
}
