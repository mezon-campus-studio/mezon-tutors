"use client";

import type { TutorResumeDto } from "@mezon-tutors/shared";
import { useTranslations } from "next-intl";
import { ResumeEntryList } from "./resume/ResumeEntry";

type TutorResumeTabProps = {
  resume: TutorResumeDto;
};

export function TutorResumeTab({ resume }: TutorResumeTabProps) {
  const t = useTranslations("Tutors.Detail");

  const hasEducation = resume.education.length > 0;
  const hasCertifications = resume.certifications.length > 0;

  if (!hasEducation && !hasCertifications) {
    return null;
  }

  return (
    <div className="flex flex-col gap-8">
      {hasEducation ? (
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-extrabold text-gray-900">
            {t("resumeTabs.education")}
          </h2>
          <ResumeEntryList
            items={resume.education}
            emptyLabel={t("resumeEmptyEducation")}
            verifiedLabel={t("resumeDegreeVerified")}
          />
        </div>
      ) : null}

      {hasCertifications ? (
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-extrabold text-gray-900">
            {t("resumeTabs.certifications")}
          </h2>
          <ResumeEntryList
            items={resume.certifications}
            emptyLabel={t("resumeEmptyCertifications")}
            verifiedLabel={t("resumeVerified")}
          />
        </div>
      ) : null}
    </div>
  );
}
