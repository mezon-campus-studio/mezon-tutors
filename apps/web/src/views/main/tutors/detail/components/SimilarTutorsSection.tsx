"use client";

import { useTranslations } from "next-intl";
import { ECountry, ESubject, ETutorSortBy, TutorAboutDto } from "@mezon-tutors/shared";
import { useCurrency } from "@/hooks";
import { useGetVerifiedTutors } from "@/services/tutor-profile/tutor-profile.api";
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

  if (isPending || isError || similarTutors.length === 0) {
    return null;
  }

  return (
    <section className="bg-white border border-gray-200 rounded-2xl p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-6">
        {t("youMightAlsoLike")}
      </h3>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
