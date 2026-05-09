"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { TUTOR_DETAIL_DEFAULT_TAB, type TutorDetailTabKey } from "@mezon-tutors/shared";
import {
  useGetVerifiedTutorAbout,
  useGetVerifiedTutorSchedule,
  useGetVerifiedTutorReviews,
  useGetVerifiedTutorResources,
} from "@/services";
import { TutorDetailHeader } from "./components/TutorDetailHeader";
import { TutorDetailSidebar } from "./components/TutorDetailSidebar";
import { TutorAboutTab } from "./components/TutorAboutTab";
import { TutorScheduleTab } from "./components/TutorScheduleTab";
import { TutorReviewsTab } from "./components/TutorReviewsTab";
import { TutorResourcesTab } from "./components/TutorResourcesTab";

type TutorDetailPageProps = {
  tutorId: string;
};

export default function TutorDetailPage({ tutorId }: TutorDetailPageProps) {
  const t = useTranslations("Tutors.Detail");
  const [activeTab, setActiveTab] = useState<TutorDetailTabKey>(TUTOR_DETAIL_DEFAULT_TAB);

  const { data: aboutData, isLoading: isLoadingAbout, isError: isErrorAbout } = useGetVerifiedTutorAbout(tutorId);
  const { data: scheduleData, isLoading: isLoadingSchedule } = useGetVerifiedTutorSchedule(
    tutorId,
    activeTab === "schedule"
  );
  const { data: reviewsData, isLoading: isLoadingReviews, isError: isErrorReviews } = useGetVerifiedTutorReviews(
    tutorId,
    activeTab === "reviews"
  );
  const { data: resourcesData, isLoading: isLoadingResources, isError: isErrorResources } = useGetVerifiedTutorResources(
    tutorId,
    activeTab === "resources"
  );

  const shouldShowEmpty = !tutorId || isErrorAbout || (!isLoadingAbout && !aboutData);

  const tabContent = useMemo(() => {
    switch (activeTab) {
      case "about":
        return aboutData ? <TutorAboutTab tutor={aboutData} /> : null;
      case "schedule":
        if (isLoadingSchedule) {
          return <p className="text-gray-500">{t("loading")}</p>;
        }
        return aboutData && scheduleData ? (
          <TutorScheduleTab tutor={{ ...aboutData, availability: scheduleData.availability }} />
        ) : null;
      case "reviews":
        if (isLoadingReviews) {
          return <p className="text-gray-500">{t("loading")}</p>;
        }
        if (isErrorReviews) {
          return <p className="text-gray-500">{t("loadError")}</p>;
        }
        return aboutData && reviewsData ? (
          <TutorReviewsTab
            tutor={{
              ...aboutData,
              reviews: reviewsData.reviews,
              ratingCount: reviewsData.ratingCount,
              ratingAverage: reviewsData.ratingAverage,
            }}
          />
        ) : null;
      case "resources":
        if (isLoadingResources) {
          return <p className="text-gray-500">{t("loading")}</p>;
        }
        if (isErrorResources) {
          return <p className="text-gray-500">{t("loadError")}</p>;
        }
        return aboutData && resourcesData ? (
          <TutorResourcesTab tutor={{ ...aboutData, resources: resourcesData.resources }} />
        ) : null;
      default:
        return null;
    }
  }, [activeTab, aboutData, scheduleData, isLoadingSchedule, reviewsData, isLoadingReviews, isErrorReviews, resourcesData, isLoadingResources, isErrorResources, t]);


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
              <h2 className="text-xl font-semibold text-gray-900">{t("notFound")}</h2>
            </div>
          </div>
        ) : null}

        {aboutData ? (
          <div className="flex flex-col lg:flex-row gap-4 items-start">
            <div className="flex-1 w-full flex flex-col">
              <TutorDetailHeader
                tutor={aboutData}
                activeTab={activeTab}
                onTabChange={setActiveTab}
              />

              <div className="bg-white border-x border-b border-gray-200 rounded-b-2xl p-6">{tabContent}</div>
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
