"use client";

import type { TutorAboutDto } from "@mezon-tutors/shared";
import { useTranslations } from "next-intl";
import { useGetVerifiedTutorResume, useGetVerifiedTutorReviews } from "@/services";
import { Skeleton } from "@/components/ui";
import { TutorAboutTab } from "./components/TutorAboutTab";
import { TutorBookingModals } from "./components/TutorBookingModals";
import { TutorDetailHeader } from "./components/TutorDetailHeader";
import { TutorLessonPackages } from "./components/TutorLessonPackages";
import { TutorReviewsTab } from "./components/TutorReviewsTab";
import { TutorScheduleTab } from "./components/TutorScheduleTab";
import { SectionCard } from "./components/SectionCard";
import { SimilarTutorsSection } from "./components/SimilarTutorsSection";
import { TutorBookingProvider, useTutorBooking } from "./hooks/TutorBookingContext";

type TutorDetailPageProps = {
  tutorId: string;
  aboutData: TutorAboutDto;
};

export default function TutorDetailPage({ tutorId, aboutData }: TutorDetailPageProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <TutorDetailPageBody aboutData={aboutData} tutorId={tutorId} />
    </div>
  );
}

function TutorDetailPageBody({
  aboutData,
  tutorId,
}: {
  aboutData: TutorAboutDto;
  tutorId: string;
}) {
  const t = useTranslations("Tutors.Detail");

  const {
    data: reviewsData,
    isLoading: isLoadingReviews,
    isError: isErrorReviews,
  } = useGetVerifiedTutorReviews(tutorId, true);
  const {
    data: resumeData,
    isLoading: isLoadingResume,
  } = useGetVerifiedTutorResume(tutorId, true);

  return (
    <TutorBookingProvider tutor={aboutData}>
      <TutorDetailHeader tutor={aboutData} />

      <div className="mx-auto max-w-5xl px-4 py-6">
        <TutorDetailPageContent
          aboutData={aboutData}
          reviewsData={reviewsData}
          isLoadingReviews={isLoadingReviews}
          isErrorReviews={isErrorReviews}
          resumeData={resumeData}
          isLoadingResume={isLoadingResume}
          t={t}
        />
      </div>
    </TutorBookingProvider>
  );
}

function PackagesSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-7 w-32" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-[148px] rounded-2xl" />
        <Skeleton className="h-[148px] rounded-2xl" />
        <Skeleton className="h-[148px] rounded-2xl" />
      </div>
    </div>
  );
}

function TutorReviewsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5 w-20" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}

function TutorDetailPageContent({
  aboutData,
  reviewsData,
  isLoadingReviews,
  isErrorReviews,
  resumeData,
  isLoadingResume,
  t,
}: {
  aboutData: TutorAboutDto;
  reviewsData: ReturnType<typeof useGetVerifiedTutorReviews>["data"];
  isLoadingReviews: boolean;
  isErrorReviews: boolean;
  resumeData: ReturnType<typeof useGetVerifiedTutorResume>["data"];
  isLoadingResume: boolean;
  t: ReturnType<typeof useTranslations<"Tutors.Detail">>;
}) {
  const booking = useTutorBooking();

  return (
    <>
      <div className="flex flex-col gap-5">
        <SectionCard>
          <TutorAboutTab
            tutor={aboutData}
            resume={resumeData}
            isLoadingResume={isLoadingResume}
          />
        </SectionCard>

        {!booking.isOwnProfile ? (
          <SectionCard>
            {true ? (
              <TutorLessonPackages tutor={aboutData} />
            ) : (
              <PackagesSkeleton />
            )}
          </SectionCard>
        ) : null}

        <SectionCard>
          <TutorScheduleTab tutor={aboutData} />
        </SectionCard>

        <SectionCard>
          {isLoadingReviews ? (
            <TutorReviewsSkeleton />
          ) : isErrorReviews ? (
            <p className="text-gray-500">{t("loadingReviews")}</p>
          ) : reviewsData ? (
            <TutorReviewsTab
              tutor={{
                ...aboutData,
                reviews: reviewsData.reviews,
                ratingCount: reviewsData.ratingCount,
                ratingAverage: reviewsData.ratingAverage,
              }}
            />
          ) : null}
        </SectionCard>

        <SimilarTutorsSection tutor={aboutData} />
      </div>

      <TutorBookingModals tutor={aboutData} booking={booking} />
    </>
  );
}
