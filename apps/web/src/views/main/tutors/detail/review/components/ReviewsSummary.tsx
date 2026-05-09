'use client';

import { useTranslations } from 'next-intl';
import { ReviewStarRating } from './ReviewStarRating';

interface ReviewsSummaryProps {
  ratingAverage: number;
  ratingCount: number;
  isMobile?: boolean;
}

export function ReviewsSummary({ ratingAverage, ratingCount, isMobile = false }: ReviewsSummaryProps) {
  const t = useTranslations('Tutors.Detail');

  if (isMobile) {
    return (
      <div className="flex items-center gap-3">
        <div className="text-5xl font-black text-gray-900 leading-none">
          {ratingAverage.toFixed(1)}
        </div>
        <div className="flex flex-col gap-1">
          <ReviewStarRating 
            rating={ratingAverage} 
            readonly 
            size={24}
            gap={4}
          />
          <p className="text-sm text-gray-500">
            {t('basedOnReviews', { count: ratingCount })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="text-4xl font-black text-gray-900 leading-tight">
        {ratingAverage.toFixed(2)}
      </div>
      <ReviewStarRating 
        rating={ratingAverage} 
        readonly 
        size={20}
        gap={4}
      />
      <p className="text-indigo-600 font-bold">
        {t('reviewsCount', { count: ratingCount })}
      </p>
    </div>
  );
}
