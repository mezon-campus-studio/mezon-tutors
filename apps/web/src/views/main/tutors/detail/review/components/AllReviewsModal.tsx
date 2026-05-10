"use client";

import { REVIEW_DISPLAY_CONFIG } from "@mezon-tutors/shared";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui";
import { useIsMobile } from "../hooks/useIsMobile";
import { ReviewCard } from "./ReviewCard";
import { ReviewStarRating } from "./ReviewStarRating";

interface AllReviewsModalProps {
  reviews: Array<{
    id: string;
    reviewerId: string;
    reviewerName: string;
    reviewerAvatar: string;
    rating: number;
    comment: string;
    createdAt: string;
    updatedAt?: string;
  }>;
  currentUserId?: string;
  isOpen: boolean;
  onClose: () => void;
  onEditReview?: () => void;
  ratingAverage: number;
  ratingCount: number;
}

export function AllReviewsModal({
  reviews,
  currentUserId,
  isOpen,
  onClose,
  onEditReview,
  ratingAverage,
  ratingCount,
}: AllReviewsModalProps) {
  const t = useTranslations("Tutors.Detail");
  const isMobile = useIsMobile();
  const [visibleCount, setVisibleCount] = useState<number>(
    REVIEW_DISPLAY_CONFIG.LOAD_MORE_COUNT,
  );

  useEffect(() => {
    if (isOpen) {
      setVisibleCount(REVIEW_DISPLAY_CONFIG.LOAD_MORE_COUNT);
    }
  }, [isOpen]);

  const visibleReviews = reviews.slice(0, visibleCount);
  const hasMore = visibleCount < reviews.length;

  const loadMore = useCallback(() => {
    if (hasMore) {
      setVisibleCount((prev) =>
        Math.min(prev + REVIEW_DISPLAY_CONFIG.LOAD_MORE_COUNT, reviews.length),
      );
    }
  }, [hasMore, reviews.length]);

  const ratingDistribution = useMemo(() => {
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((review) => {
      distribution[review.rating as keyof typeof distribution]++;
    });
    return distribution;
  }, [reviews]);

  const maxCount = Math.max(1, ...Object.values(ratingDistribution));

  const ratingBars = useMemo(() => {
    return [5, 4, 3, 2, 1].map((star) => {
      const count = ratingDistribution[star as keyof typeof ratingDistribution];
      const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
      return { star, count, percentage };
    });
  }, [ratingDistribution, maxCount]);

  const isOwnReview = useCallback(
    (reviewerId: string) => {
      return currentUserId === reviewerId;
    },
    [currentUserId],
  );

  if (isMobile) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="fixed inset-0 left-0 top-0 h-full w-full max-h-full max-w-full translate-x-0 translate-y-0 p-0 m-0 rounded-none">
          <div className="h-full w-full flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-center relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="absolute left-4"
              >
                <ArrowLeft size={24} className="text-gray-600" />
              </Button>
              <h2 className="text-lg font-semibold text-gray-900">
                {t("allReviewsTitle")}
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pt-4">
              <div className="flex flex-col gap-4 mb-4">
                <div className="flex gap-4 items-start">
                  <div className="flex flex-col gap-2 items-center min-w-[80px]">
                    <div className="text-5xl font-black text-gray-900 leading-none">
                      {ratingAverage.toFixed(1)}
                    </div>
                    <ReviewStarRating
                      rating={ratingAverage}
                      readonly
                      size={16}
                      gap={2}
                    />
                    <p className="text-sm text-gray-500">
                      {ratingCount} {t("reviews")}
                    </p>
                  </div>

                  <div className="flex-1 flex flex-col gap-1.5">
                    {ratingBars.map(({ star, percentage }) => (
                      <div key={star} className="flex items-center gap-2">
                        <span className="text-sm text-gray-900 min-w-[12px]">
                          {star}
                        </span>
                        <div className="flex-1 h-2 bg-gray-200 rounded overflow-hidden">
                          <div
                            className="h-full bg-gray-900"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 pb-4">
                <h3 className="text-lg font-bold text-gray-900">
                  {ratingCount} {t("reviews")}
                </h3>

                {visibleReviews.map((review) => {
                  const isOwn = isOwnReview(review.reviewerId);
                  return (
                    <ReviewCard
                      key={review.id}
                      review={review}
                      showFullComment
                      isOwnReview={isOwn}
                      onEdit={onEditReview}
                      compact
                    />
                  );
                })}

                {hasMore && (
                  <Button
                    variant="outline"
                    onClick={loadMore}
                    className="mt-2 rounded-xl"
                  >
                    {t("loadMoreReviews")}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[720px] w-[92%] max-h-[90vh] p-5 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900">
            {t("allReviewsTitle")}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600 mt-1">
            {t("basedOnReviews", { count: reviews.length })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 max-h-[520px] overflow-y-auto flex flex-col gap-3 pr-2 pb-4 mt-3 scrollbar-hide">
          {visibleReviews.map((review) => {
            const isOwn = isOwnReview(review.reviewerId);
            return (
              <ReviewCard
                key={review.id}
                review={review}
                showFullComment
                isOwnReview={isOwn}
                onEdit={onEditReview}
                compact
              />
            );
          })}

          {hasMore && (
            <div className="flex items-center justify-center mt-2">
              <Button
                variant="outline"
                onClick={loadMore}
                className="px-6 py-2.5 rounded-lg"
              >
                {t("loadMoreReviews")}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
