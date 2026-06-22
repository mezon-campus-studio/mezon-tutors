"use client";

import { useTranslations } from "next-intl";
import {
  useGetVerifiedTutorAbout,
  useGetVerifiedTutorResources,
  useGetVerifiedTutorResume,
  useGetVerifiedTutorReviews,
  useGetVerifiedTutorSchedule,
} from "@/services";
import { TutorAboutTab } from "./components/TutorAboutTab";
import { TutorDetailHeader } from "./components/TutorDetailHeader";
import { TutorDetailSidebar } from "./components/TutorDetailSidebar";
import { TutorResourcesTab } from "./components/TutorResourcesTab";
import { TutorResumeTab } from "./components/TutorResumeTab";
import { TutorReviewsTab } from "./components/TutorReviewsTab";
import { TutorScheduleTab } from "./components/TutorScheduleTab";

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
  const { data: scheduleData, isLoading: isLoadingSchedule } =
    useGetVerifiedTutorSchedule(tutorId, true);
  const {
    data: reviewsData,
    isLoading: isLoadingReviews,
    isError: isErrorReviews,
  } = useGetVerifiedTutorReviews(tutorId, true);
  const {
    data: resourcesData,
    isLoading: isLoadingResources,
    isError: isErrorResources,
  } = useGetVerifiedTutorResources(tutorId, true);
  const {
    data: resumeData,
    isLoading: isLoadingResume,
    isError: isErrorResume,
  } = useGetVerifiedTutorResume(tutorId, true);

  const hasResumeItems =
    (resumeData?.education.length ?? 0) > 0 ||
    (resumeData?.certifications.length ?? 0) > 0;

  const shouldShowEmpty =
    !tutorId || isErrorAbout || (!isLoadingAbout && !aboutData);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {isLoadingAbout ? (
          <div className="w-full min-h-[260px] bg-white rounded-2xl border border-gray-200 flex items-center justify-center">
            <p className="text-gray-500">{t("loading")}</p>
          </div>
        ) : null}

        {shouldShowEmpty ? (
          <div className="pt-4">
            <div className="text-center py-12">
              <h2 className="text-xl font-semibold text-gray-900">
                {t("notFound")}
              </h2>
            </div>
          </div>
        ) : null}

        {aboutData ? (
          <div className="flex flex-col lg:flex-row gap-4 items-start">
            <div className="flex-1 w-full flex flex-col gap-6">
              <TutorDetailHeader tutor={aboutData} />

              {/* About Section */}
              <section className="bg-white border border-gray-200 rounded-2xl p-6">
                <TutorAboutTab tutor={aboutData} />
              </section>

              {/* Resume Section */}
              {!isErrorResume && (isLoadingResume || hasResumeItems) ? (
                <section className="bg-white border border-gray-200 rounded-2xl p-6">
                  {isLoadingResume ? (
                    <p className="text-gray-500">{t("loading")}</p>
                  ) : resumeData ? (
                    <TutorResumeTab resume={resumeData} />
                  ) : null}
                </section>
              ) : null}

              {/* Schedule Section */}
              <section className="bg-white border border-gray-200 rounded-2xl p-6">
                {isLoadingSchedule ? (
                  <p className="text-gray-500">{t("loading")}</p>
                ) : aboutData && scheduleData ? (
                  <TutorScheduleTab
                    tutor={{
                      ...aboutData,
                      availability: scheduleData.availability,
                    }}
                  />
                ) : null}
              </section>

              {/* Reviews Section */}
              <section className="bg-white border border-gray-200 rounded-2xl p-6">
                {isLoadingReviews ? (
                  <p className="text-gray-500">{t("loading")}</p>
                ) : isErrorReviews ? (
                  <p className="text-gray-500">{t("loadError")}</p>
                ) : aboutData && reviewsData ? (
                  <TutorReviewsTab
                    tutor={{
                      ...aboutData,
                      reviews: reviewsData.reviews,
                      ratingCount: reviewsData.ratingCount,
                      ratingAverage: reviewsData.ratingAverage,
                    }}
                  />
                ) : null}
              </section>

              {/* Resources Section */}
              <section className="bg-white border border-gray-200 rounded-2xl p-6">
                {isLoadingResources ? (
                  <p className="text-gray-500">{t("loading")}</p>
                ) : isErrorResources ? (
                  <p className="text-gray-500">{t("loadError")}</p>
                ) : aboutData && resourcesData ? (
                  <TutorResourcesTab
                    tutor={{
                      ...aboutData,
                      resources: resourcesData.resources,
                    }}
                  />
                ) : null}
              </section>
            </div>

            <div className="w-full lg:w-80">
              <TutorDetailSidebar tutor={aboutData} />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
