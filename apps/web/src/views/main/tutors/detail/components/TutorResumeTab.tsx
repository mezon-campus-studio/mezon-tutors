"use client";

import type { TutorResumeDto, TutorResumeItemDto } from "@mezon-tutors/shared";
import { CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

type ResumeTab = "education" | "certifications";

type TutorResumeTabProps = {
  resume: TutorResumeDto;
};

function formatYearComplete(year: number | null): string | null {
  if (!year) return null;
  return String(year);
}

function getSubtitle(item: TutorResumeItemDto): string | null {
  const parts = [item.institution, item.specialization]
    .filter((value): value is string => Boolean(value?.trim()))
    .filter((value, index, array) => array.indexOf(value) === index)
    .filter((value) => value.trim().toLowerCase() !== item.name.trim().toLowerCase());

  return parts.length > 0 ? parts.join(" · ") : null;
}

function ResumeEntry({
  item,
  verifiedLabel,
}: {
  item: TutorResumeItemDto;
  verifiedLabel: string;
}) {
  const yearLabel = formatYearComplete(item.yearOfComplete);
  const subtitle = getSubtitle(item);

  return (
    <div className="grid grid-cols-[88px_1fr] gap-x-6 gap-y-1 sm:grid-cols-[120px_1fr]">
      <p className="pt-0.5 text-sm font-medium text-gray-500">
        {yearLabel ?? ""}
      </p>

      <div className="flex flex-col gap-1.5">
        <h3 className="text-base font-bold text-gray-900">{item.name}</h3>

        {subtitle ? (
          <p className="text-sm leading-6 text-gray-500">{subtitle}</p>
        ) : null}

        {item.isVerified ? (
          <div className="mt-1 flex items-center gap-1.5 text-sm font-medium text-emerald-600">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>{verifiedLabel}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function TutorResumeTab({ resume }: TutorResumeTabProps) {
  const t = useTranslations("Tutors.Detail");

  const hasEducation = resume.education.length > 0;
  const hasCertifications = resume.certifications.length > 0;

  const defaultTab = useMemo<ResumeTab>(() => {
    if (hasCertifications) return "certifications";
    return "education";
  }, [hasCertifications]);

  const [activeTab, setActiveTab] = useState<ResumeTab>(defaultTab);

  const items =
    activeTab === "education" ? resume.education : resume.certifications;
  const emptyLabel =
    activeTab === "education"
      ? t("resumeEmptyEducation")
      : t("resumeEmptyCertifications");
  const verifiedLabel =
    activeTab === "education"
      ? t("resumeDegreeVerified")
      : t("resumeVerified");

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-extrabold text-gray-900">
        {t("resumeTitle")}
      </h2>

      <div className="border-b border-gray-200">
        <div className="flex gap-8">
          {hasEducation ? (
            <button
              type="button"
              onClick={() => setActiveTab("education")}
              className={`relative pb-3 text-sm font-semibold transition-colors ${
                activeTab === "education"
                  ? "text-gray-900"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t("resumeTabs.education")}
              {activeTab === "education" ? (
                <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-fuchsia-500" />
              ) : null}
            </button>
          ) : null}

          {hasCertifications ? (
            <button
              type="button"
              onClick={() => setActiveTab("certifications")}
              className={`relative pb-3 text-sm font-semibold transition-colors ${
                activeTab === "certifications"
                  ? "text-gray-900"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t("resumeTabs.certifications")}
              {activeTab === "certifications" ? (
                <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-fuchsia-500" />
              ) : null}
            </button>
          ) : null}
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-gray-500">{emptyLabel}</p>
      ) : (
        <div className="flex flex-col gap-8">
          {items.map((item) => (
            <ResumeEntry
              key={item.id}
              item={item}
              verifiedLabel={verifiedLabel}
            />
          ))}
        </div>
      )}
    </div>
  );
}
