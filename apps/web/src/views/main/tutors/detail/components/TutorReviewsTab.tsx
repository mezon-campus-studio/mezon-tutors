"use client";

import type { TutorAboutDto, TutorReviewDto } from "@mezon-tutors/shared";
import { ReviewsSection } from "../review/components/ReviewsSection";

type TutorReviewsTabProps = {
  tutor: TutorAboutDto & {
    reviews: TutorReviewDto[];
    ratingCount: number;
    ratingAverage: number;
  };
};

export function TutorReviewsTab({ tutor }: TutorReviewsTabProps) {
  return (
    <ReviewsSection
      tutorId={tutor.id}
      tutorName={`${tutor.firstName} ${tutor.lastName}`}
      ratingAverage={tutor.ratingAverage}
      ratingCount={tutor.ratingCount}
      reviews={tutor.reviews}
    />
  );
}
