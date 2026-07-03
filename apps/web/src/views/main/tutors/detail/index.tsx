"use client";

import { useTranslations } from "next-intl";
import {
  useGetVerifiedTutorAbout,
  useGetVerifiedTutorResume,
  useGetVerifiedTutorReviews,
} from "@/services";
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
};

export default function TutorDetailPage({ tutorId }: TutorDetailPageProps) {
  const t = useTranslations("Tutors.Detail");

  const {
    data: aboutData,
    isLoading: isLoadingAbout,
    isError: isErrorAbout,
  } = useGetVerifiedTutorAbout(tutorId);

  const shouldShowEmpty =
    !tutorId || isErrorAbout || (!isLoadingAbout && !aboutData);

  return (
    <div className="min-h-screen bg-gray-50">
      {isLoadingAbout ? (
        <div className="mx-auto max-w-5xl px-4 py-6">
          <div className="flex min-h-[260px] w-full items-center justify-center rounded-2xl border border-gray-200 bg-white">
            <p className="text-gray-500">{t("loading")}</p>
          </div>
        </div>
      ) : null}

      {shouldShowEmpty ? (
        <div className="mx-auto max-w-5xl px-4 py-6">
          <div className="py-12 text-center">
            <h2 className="text-xl font-semibold text-gray-900">
              {t("notFound")}
            </h2>
          </div>
        </div>
      ) : null}

      {aboutData ? (
        <TutorDetailPageBody aboutData={aboutData} tutorId={tutorId} />
      ) : null}
    </div>
  );
}

function TutorDetailPageBody({
  aboutData,
  tutorId,
}: {
  aboutData: NonNullable<ReturnType<typeof useGetVerifiedTutorAbout>["data"]>;
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

function TutorDetailPageContent({
  aboutData,
  reviewsData,
  isLoadingReviews,
  isErrorReviews,
  resumeData,
  isLoadingResume,
  t,
}: {
  aboutData: NonNullable<ReturnType<typeof useGetVerifiedTutorAbout>["data"]>;
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

        <SectionCard>
          <TutorLessonPackages tutor={aboutData} />
        </SectionCard>

        <SectionCard>
          <TutorScheduleTab tutor={aboutData} />
        </SectionCard>

        <SectionCard>
          {isLoadingReviews ? (
            <p className="text-gray-500">{t("loading")}</p>
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
