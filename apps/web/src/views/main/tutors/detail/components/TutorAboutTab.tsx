"use client";

import type { TutorAboutDto, TutorResumeDto } from "@mezon-tutors/shared";
import { MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import VideoPreview from "../../components/VideoPreview";
import { useTutorBooking } from "../hooks/TutorBookingContext";
import { TutorAboutDetailModal } from "./TutorAboutDetailModal";
import { TutorProfileTags } from "./TutorProfileTags";
import { TutorResumePreview } from "./TutorResumePreview";

type TutorAboutTabProps = {
  tutor: TutorAboutDto;
  resume?: TutorResumeDto | null;
  isLoadingResume?: boolean;
};

const VIDEO_HEIGHT = 280;

export function TutorAboutTab({
  tutor,
  resume,
  isLoadingResume = false,
}: TutorAboutTabProps) {
  const t = useTranslations("Tutors.Detail");
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const booking = useTutorBooking();

  const headline = tutor.headline || t("defaultHeadline");
  const intro = tutor.introduce || t("emptySection");

  const hasResumePreview =
    (resume?.education.length ?? 0) > 0 ||
    (resume?.certifications.length ?? 0) > 0;

  const showReadMore =
    intro.length > 200 ||
    Boolean(tutor.experience?.trim()) ||
    hasResumePreview ||
    isLoadingResume;

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="grid items-stretch gap-6 lg:grid-cols-2">
          <div className="flex h-[280px] min-h-0 flex-col overflow-hidden">
            <h2 className="shrink-0 text-lg font-bold leading-snug text-gray-900 sm:text-xl">
              {headline}
            </h2>

            <div className="relative mt-3 min-h-0 flex-1 overflow-hidden">
              <p className="text-sm leading-7 text-gray-600 sm:text-base">
                {intro}
              </p>
              {showReadMore ? (
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent" />
              ) : null}
            </div>

            {showReadMore ? (
              <button
                type="button"
                onClick={() => setIsDetailOpen(true)}
                className="cursor-pointer mt-2 shrink-0 self-start text-sm font-semibold text-violet-600 hover:text-violet-700"
              >
                {t("readMore")}
              </button>
            ) : null}
          </div>

          <VideoPreview
            videoUrl={tutor.videoUrl}
            height={VIDEO_HEIGHT}
            title={t("videoIntroTitle")}
          />
        </div>

        <TutorResumePreview resume={resume} isLoading={isLoadingResume} />

        <div className="border-t border-gray-200" />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TutorProfileTags tutor={tutor} className="min-w-0 flex-1" />

          {!booking.isOwnProfile ? (
            <Button
              variant="gradient"
              disabled={!booking.senderId}
              onClick={() => booking.setIsMessageModalOpen(true)}
              className={cn(
                "h-11 shrink-0 rounded-full px-5 text-sm font-semibold sm:ml-4",
              )}
            >
              <MessageCircle className="mr-2 size-4" />
              {t("contactTeacher")}
            </Button>
          ) : null}
        </div>
      </div>

      <TutorAboutDetailModal
        tutor={tutor}
        resume={resume}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
      />
    </>
  );
}
