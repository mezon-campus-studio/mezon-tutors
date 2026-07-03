"use client";

import type { TutorResumeDto } from "@mezon-tutors/shared";
import { useTranslations } from "next-intl";
import { ResumeEntryList } from "./resume/ResumeEntry";

const PREVIEW_COUNT = 2;

type TutorResumePreviewProps = {
  resume?: TutorResumeDto | null;
  isLoading?: boolean;
};

export function TutorResumePreview({
  resume,
  isLoading = false,
}: TutorResumePreviewProps) {
  const t = useTranslations("Tutors.Detail");

  if (isLoading) {
    return <p className="text-sm text-gray-500">{t("loading")}</p>;
  }

  const education = resume?.education ?? [];
  const certifications = resume?.certifications ?? [];

  if (education.length === 0 && certifications.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-bold text-gray-900">
          {t("resumeTabs.education")}
        </h3>
        <ResumeEntryList
          items={education.slice(0, PREVIEW_COUNT)}
          emptyLabel={t("resumeEmptyEducation")}
          verifiedLabel={t("resumeDegreeVerified")}
          compact
        />
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-bold text-gray-900">
          {t("resumeTabs.certifications")}
        </h3>
        <ResumeEntryList
          items={certifications.slice(0, PREVIEW_COUNT)}
          emptyLabel={t("resumeEmptyCertifications")}
          verifiedLabel={t("resumeVerified")}
          compact
        />
      </div>
    </div>
  );
}
