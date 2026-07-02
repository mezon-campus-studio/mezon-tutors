"use client";

import { useTranslations } from "next-intl";
import { ReviewStarRating } from "./ReviewStarRating";

interface ReviewsSummaryProps {
  ratingAverage: number;
  ratingCount: number;
  totalStudents?: number;
  isMobile?: boolean;
}

export function ReviewsSummary({
  ratingAverage,
  ratingCount,
  totalStudents,
  isMobile = false,
}: ReviewsSummaryProps) {
  const t = useTranslations("Tutors.Detail");

  if (isMobile) {
    return (
      <div className="flex items-center gap-4">
        <div className="text-5xl font-black leading-none text-gray-900">
          {ratingAverage.toFixed(1)}
        </div>
        <div className="flex flex-col gap-1">
          <ReviewStarRating rating={ratingAverage} readonly size={22} gap={4} />
          <p className="text-sm text-gray-500">
            {t("reviewsCount", { count: ratingCount })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 border-b border-gray-100 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col items-start gap-2">
        <div className="text-5xl font-black leading-none text-gray-900">
          {ratingAverage.toFixed(1)}
        </div>
        <ReviewStarRating rating={ratingAverage} readonly size={24} gap={4} />
      </div>

      <div className="grid flex-1 grid-cols-3 gap-4 sm:max-w-xl">
        <div className="text-center sm:text-left">
          <p className="text-2xl font-bold text-gray-900">{ratingCount}</p>
          <p className="text-sm text-gray-500">{t("reviewsLabel")}</p>
        </div>
        <div className="text-center sm:text-left">
          <p className="text-2xl font-bold text-gray-900">
            {totalStudents != null ? totalStudents.toLocaleString() : "—"}
          </p>
          <p className="text-sm text-gray-500">{t("statsTotalStudents")}</p>
        </div>
        <div className="text-center sm:text-left">
          <p className="text-2xl font-bold text-gray-900">
            {ratingCount > 0 ? "100%" : "—"}
          </p>
          <p className="text-sm text-gray-500">{t("responseRate")}</p>
        </div>
      </div>
    </div>
  );
}
