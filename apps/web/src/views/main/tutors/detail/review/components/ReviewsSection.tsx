"use client";

import { REVIEW_DISPLAY_CONFIG } from "@mezon-tutors/shared";
import { useAtomValue } from "jotai";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui";
import { useGetAlreadyBookedTrialLesson } from "@/services";
import { userAtom } from "@/store/auth.atom";
import { useIsMobile } from "../hooks/useIsMobile";
import { AllReviewsModal } from "./AllReviewsModal";
import { ReviewCard } from "./ReviewCard";
import { ReviewModal } from "./ReviewModal";
import { ReviewsSummary } from "./ReviewsSummary";

interface ReviewsSectionProps {
  tutorId: string;
  tutorName: string;
  ratingAverage: number;
  ratingCount: number;
  totalStudents?: number;
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
}

export function ReviewsSection({
  tutorId,
  tutorName,
  ratingAverage,
  ratingCount,
  totalStudents,
  reviews,
}: ReviewsSectionProps) {
  const t = useTranslations("Tutors.Detail");
  const isMobile = useIsMobile();
  const [isAllReviewsOpen, setIsAllReviewsOpen] = useState(false);
  const [isPostReviewOpen, setIsPostReviewOpen] = useState(false);

  const currentUser = useAtomValue(userAtom);
  const currentUserId = currentUser?.id;

  const { data: bookingStatus, isLoading: isLoadingBooking } =
    useGetAlreadyBookedTrialLesson(tutorId, !!currentUserId);
  const hasCompletedLesson =
    bookingStatus?.hasBooked && bookingStatus?.status === "COMPLETED";

  const myReviewFromList = useMemo(() => {
    if (!currentUserId) return null;
    return reviews.find((r) => r.reviewerId === currentUserId) || null;
  }, [reviews, currentUserId]);

  const showPostReviewButton =
    !!currentUserId && !isLoadingBooking && hasCompletedLesson;

  const sortedReviews = useMemo(() => {
    if (!currentUserId) return reviews;

    const myReviewIndex = reviews.findIndex(
      (r) => r.reviewerId === currentUserId,
    );
    if (myReviewIndex === -1) return reviews;

    const myReviewItem = reviews[myReviewIndex];
    const otherReviews = reviews.filter((_, index) => index !== myReviewIndex);

    return [myReviewItem, ...otherReviews];
  }, [reviews, currentUserId]);

  const visibleReviews = useMemo(
    () =>
      sortedReviews.slice(
        0,
        isMobile ? 2 : REVIEW_DISPLAY_CONFIG.INITIAL_VISIBLE_COUNT,
      ),
    [sortedReviews, isMobile],
  );

  const leftColumnReviews = useMemo(
    () =>
      visibleReviews.filter(
        (_, index) => index % REVIEW_DISPLAY_CONFIG.COLUMNS === 0,
      ),
    [visibleReviews],
  );

  const rightColumnReviews = useMemo(
    () =>
      visibleReviews.filter(
        (_, index) => index % REVIEW_DISPLAY_CONFIG.COLUMNS === 1,
      ),
    [visibleReviews],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          className={`font-bold text-gray-900 ${isMobile ? "text-xl" : "text-2xl"}`}
        >
          {t("whatStudentsSay")}
        </h2>
        {showPostReviewButton ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsPostReviewOpen(true)}
            className="rounded-xl border-violet-200 text-violet-700 hover:bg-violet-50"
          >
            {myReviewFromList ? t("editReview") : t("postReview")}
          </Button>
        ) : null}
      </div>

      <ReviewsSummary
        ratingAverage={ratingAverage}
        ratingCount={ratingCount}
        totalStudents={totalStudents}
        isMobile={isMobile}
      />

      {reviews.length === 0 ? (
        <p className="text-gray-500">{t("reviewsEmpty")}</p>
      ) : (
        <>
          {isMobile ? (
            <div className="flex w-full flex-col gap-3">
              {visibleReviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  isOwnReview={currentUserId === review.reviewerId}
                  onEdit={() => setIsPostReviewOpen(true)}
                />
              ))}
            </div>
          ) : (
            <div className="flex w-full items-start gap-4">
              <div className="flex flex-1 flex-col gap-4">
                {leftColumnReviews.map((review) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    isOwnReview={currentUserId === review.reviewerId}
                    onEdit={() => setIsPostReviewOpen(true)}
                  />
                ))}
              </div>
              <div className="flex flex-1 flex-col gap-4">
                {rightColumnReviews.map((review) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    isOwnReview={currentUserId === review.reviewerId}
                    onEdit={() => setIsPostReviewOpen(true)}
                  />
                ))}
              </div>
            </div>
          )}

          {reviews.length >
            (isMobile ? 2 : REVIEW_DISPLAY_CONFIG.INITIAL_VISIBLE_COUNT) && (
            <Button
              variant="outline"
              onClick={() => setIsAllReviewsOpen(true)}
              className={`mt-2 self-center rounded-xl ${isMobile ? "w-full py-3" : "px-8 py-2"}`}
            >
              {t("showMore")}
              <ChevronDown className="ml-2 size-4" />
            </Button>
          )}
        </>
      )}

      <AllReviewsModal
        reviews={sortedReviews}
        currentUserId={currentUserId}
        isOpen={isAllReviewsOpen}
        onClose={() => setIsAllReviewsOpen(false)}
        onEditReview={() => {
          setIsAllReviewsOpen(false);
          setIsPostReviewOpen(true);
        }}
        ratingAverage={ratingAverage}
        ratingCount={ratingCount}
      />

      <ReviewModal
        tutorId={tutorId}
        tutorName={tutorName}
        existingReview={myReviewFromList}
        isOpen={isPostReviewOpen}
        onClose={() => setIsPostReviewOpen(false)}
      />
    </div>
  );
}
