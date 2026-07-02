"use client";

import type { TutorAboutDto } from "@mezon-tutors/shared";
import { GraduationCap, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import { TutorLanguageTags } from "./TutorLanguageTags";

type TutorProfileTagsProps = {
  tutor: Pick<TutorAboutDto, "subject" | "country" | "languages">;
  className?: string;
  showSubject?: boolean;
};

export function TutorProfileTags({
  tutor,
  className,
  showSubject = true,
}: TutorProfileTagsProps) {
  const tSubject = useTranslations("Tutors.Filter.Subject");
  const tCountry = useTranslations("Tutors.Filter.Country");

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2">
        {showSubject ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 ring-1 ring-violet-100">
            <GraduationCap className="size-3.5" />
            {tSubject(tutor.subject)}
          </span>
        ) : null}
        <span className="inline-flex items-center gap-1.5 rounded-full bg-fuchsia-50 px-3 py-1 text-xs font-semibold text-fuchsia-700 ring-1 ring-fuchsia-100">
          <MapPin className="size-3.5" />
          {tCountry(tutor.country)}
        </span>
        <TutorLanguageTags languages={tutor.languages} />
      </div>
    </div>
  );
}
