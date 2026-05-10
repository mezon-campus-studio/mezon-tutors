"use client";

import {
  TUTOR_DETAIL_TAB_KEYS,
  type TutorAboutDto,
  type TutorDetailTabKey,
} from "@mezon-tutors/shared";
import { BadgeCheck, GraduationCap, MapPin, Star } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";

type TutorDetailHeaderProps = {
  tutor: TutorAboutDto;
  activeTab: TutorDetailTabKey;
  onTabChange: (tab: TutorDetailTabKey) => void;
};

export function TutorDetailHeader({
  tutor,
  activeTab,
  onTabChange,
}: TutorDetailHeaderProps) {
  const t = useTranslations("Tutors.Detail");
  const tSubject = useTranslations("Tutors.Filter.Subject");
  const tCountry = useTranslations("Tutors.Filter.Country");

  const name = `${tutor.firstName} ${tutor.lastName}`.trim();

  return (
    <div className="overflow-hidden rounded-t-3xl border border-violet-100 bg-white">
      <div className="relative">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,#faf5ff_0%,transparent_100%)]" />
        <div className="relative flex flex-col gap-5 p-6 sm:flex-row sm:items-start">
          <div className="relative shrink-0">
            <Image
              src={tutor.avatar}
              alt={name}
              width={120}
              height={120}
              priority
              className="size-24 rounded-2xl object-cover object-center shadow-md shadow-violet-200/40 ring-2 ring-white sm:size-28"
            />
            {tutor.isProfessional ? (
              <div className="absolute -bottom-1 -right-1 flex items-center gap-1 rounded-full bg-[linear-gradient(135deg,#7c3aed,#ec4899)] px-2 py-0.5 text-[10px] font-bold text-white shadow-md shadow-violet-300/40 ring-2 ring-white">
                <BadgeCheck className="size-3" strokeWidth={3} />
                Pro
              </div>
            ) : null}
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
                {name}
              </h1>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-600 ring-1 ring-amber-100">
                <Star className="size-3.5 fill-amber-400 text-amber-400" />
                {tutor.ratingAverage.toFixed(2)}
                <span className="font-medium text-amber-500/80">
                  · {t("reviewsCount", { count: tutor.ratingCount })}
                </span>
              </span>
            </div>

            {tutor.headline ? (
              <p className="text-sm leading-6 text-slate-600 sm:text-base">
                {tutor.headline}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 ring-1 ring-violet-100">
                <GraduationCap className="size-3.5" />
                {tSubject(tutor.subject)}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-fuchsia-50 px-3 py-1 text-xs font-semibold text-fuchsia-700 ring-1 ring-fuchsia-100">
                <MapPin className="size-3.5" />
                {tCountry(tutor.country)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="scrollbar-hide overflow-x-auto border-t border-violet-100 bg-white px-3">
        <div className="flex items-center gap-1 py-1.5">
          {TUTOR_DETAIL_TAB_KEYS.map((tab) => {
            const isActive = tab === activeTab;
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`tab-panel-${tab}`}
                onClick={() => onTabChange(tab)}
                className={`group relative whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300 ${
                  isActive
                    ? "text-violet-700"
                    : "text-slate-600 hover:text-violet-700"
                }`}
              >
                <span
                  className={`pointer-events-none absolute inset-0 -z-10 rounded-full bg-[linear-gradient(110deg,#faf5ff,#fdf2f8)] ring-1 ring-inset transition-all duration-300 ${
                    isActive
                      ? "scale-100 opacity-100 ring-violet-100"
                      : "scale-90 opacity-0 ring-transparent group-hover:scale-100 group-hover:opacity-100 group-hover:ring-violet-100"
                  }`}
                />
                <span className="relative">{t(`tabs.${tab}`)}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
