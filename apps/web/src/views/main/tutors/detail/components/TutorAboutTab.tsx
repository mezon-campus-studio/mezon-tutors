"use client";

import type { TutorAboutDto } from "@mezon-tutors/shared";
import { Languages, Sparkles, User } from "lucide-react";
import { useTranslations } from "next-intl";
import VideoPreview from "../../components/VideoPreview";

type TutorAboutTabProps = {
  tutor: TutorAboutDto;
};

const PROFICIENCY_ACCENT: Record<string, string> = {
  NATIVE: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  NEAR_NATIVE: "bg-violet-50 text-violet-700 ring-violet-100",
  ADVANCED: "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-100",
  UPPER_INTERMEDIATE: "bg-blue-50 text-blue-700 ring-blue-100",
  INTERMEDIATE: "bg-indigo-50 text-indigo-700 ring-indigo-100",
  PRE_INTERMEDIATE: "bg-amber-50 text-amber-700 ring-amber-100",
  BEGINNER: "bg-slate-50 text-slate-700 ring-slate-200",
};

function SectionTitle({
  icon: Icon,
  eyebrow,
  title,
}: {
  icon: typeof User;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-9 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#ede9fe,#fce7f3)] text-violet-700 ring-1 ring-violet-100">
        <Icon className="size-4" />
      </div>
      <div className="leading-tight">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-500">
          {eyebrow}
        </p>
        <h2 className="text-lg font-extrabold text-slate-900">{title}</h2>
      </div>
    </div>
  );
}

export function TutorAboutTab({ tutor }: TutorAboutTabProps) {
  const t = useTranslations("Tutors.Detail");
  const tCardLabels = useTranslations("Tutors.TutorCard");
  const tLanguage = useTranslations("Tutors.Filter.Language");

  return (
    <div className="flex flex-col gap-7">
      <VideoPreview
        videoUrl={tutor.videoUrl}
        height={360}
        title={t("videoIntroTitle")}
      />

      <div className="flex flex-col gap-3">
        <SectionTitle
          icon={User}
          eyebrow="Introduction"
          title={t("aboutTitle")}
        />
        <p className="text-sm leading-7 text-slate-700 sm:text-base">
          {tutor.introduce || t("emptySection")}
        </p>
      </div>

      {tutor.experience ? (
        <div className="flex flex-col gap-3">
          <SectionTitle
            icon={Sparkles}
            eyebrow="Experience"
            title={t("experienceTitle")}
          />
          <p className="text-sm leading-7 text-slate-700 sm:text-base">
            {tutor.experience}
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        <SectionTitle
          icon={Languages}
          eyebrow="Spoken"
          title={t("languagesTitle")}
        />
        <div className="flex flex-wrap gap-2">
          {tutor.languages.map((language) => {
            const accent =
              PROFICIENCY_ACCENT[language.proficiency as string] ??
              "bg-slate-50 text-slate-700 ring-slate-200";
            return (
              <span
                key={`${language.languageCode}-${language.proficiency}`}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${accent}`}
              >
                <span className="font-bold">
                  {tLanguage(language.languageCode as unknown as string)}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                  {tCardLabels(`proficiency.${language.proficiency}`)}
                </span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
