"use client";

import type { TutorLanguageDto } from "@mezon-tutors/shared";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const PROFICIENCY_ACCENT: Record<string, string> = {
  NATIVE: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  NEAR_NATIVE: "bg-violet-50 text-violet-700 ring-violet-100",
  FLUENT: "bg-violet-50 text-violet-700 ring-violet-100",
  ADVANCED: "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-100",
  UPPER_INTERMEDIATE: "bg-blue-50 text-blue-700 ring-blue-100",
  INTERMEDIATE: "bg-indigo-50 text-indigo-700 ring-indigo-100",
  PRE_INTERMEDIATE: "bg-amber-50 text-amber-700 ring-amber-100",
  ELEMENTARY: "bg-slate-50 text-slate-700 ring-slate-200",
  BASIC: "bg-slate-50 text-slate-700 ring-slate-200",
  BEGINNER: "bg-slate-50 text-slate-700 ring-slate-200",
};

type TutorLanguageTagsProps = {
  languages: TutorLanguageDto[];
  className?: string;
  variant?: "badges" | "chips";
};

export function TutorLanguageTags({
  languages,
  className,
  variant = "badges",
}: TutorLanguageTagsProps) {
  const tLanguage = useTranslations("Tutors.Filter.Language");
  const tCardLabels = useTranslations("Tutors.TutorCard");

  if (languages.length === 0) {
    return null;
  }

  if (variant === "chips") {
    return (
      <div className={cn("flex flex-wrap gap-2", className)}>
        {languages.map((language) => (
          <span
            key={`${language.languageCode}-${language.proficiency}`}
            className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700"
          >
            {tLanguage(language.languageCode as unknown as string)}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {languages.map((language) => {
        const accent =
          PROFICIENCY_ACCENT[language.proficiency as string] ??
          "bg-slate-50 text-slate-700 ring-slate-200";

        return (
          <span
            key={`${language.languageCode}-${language.proficiency}`}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ring-1",
              accent,
            )}
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
  );
}
