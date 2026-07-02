"use client";

import { formatDateDMY, REVIEW_DISPLAY_CONFIG } from "@mezon-tutors/shared";
import { Edit2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
} from "@/components/ui";
import { ReviewStarRating } from "./ReviewStarRating";

function initials(name?: string) {
  if (!name?.trim()) return "S";
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "S"
  );
}

interface ReviewCardProps {
  review: {
    id: string;
    reviewerName: string;
    reviewerAvatar: string;
    rating: number;
    comment: string;
    createdAt: string;
    updatedAt?: string;
  };
  showFullComment?: boolean;
  isOwnReview?: boolean;
  onEdit?: () => void;
  compact?: boolean;
}

export function ReviewCard({
  review,
  showFullComment = false,
  isOwnReview = false,
  onEdit,
  compact = false,
}: ReviewCardProps) {
  const t = useTranslations("Tutors.Detail");
  const [isExpanded, setIsExpanded] = useState(showFullComment);

  const shouldTruncate =
    !showFullComment &&
    review.comment.length > REVIEW_DISPLAY_CONFIG.COMMENT_PREVIEW_LENGTH;
  const displayComment =
    isExpanded || showFullComment
      ? review.comment
      : review.comment.slice(0, REVIEW_DISPLAY_CONFIG.COMMENT_PREVIEW_LENGTH) +
        (shouldTruncate ? "..." : "");

  const reviewerAvatarUrl = review.reviewerAvatar?.trim() || null;
  const isEdited = review.updatedAt && review.updatedAt !== review.createdAt;

  return (
    <div
      className={`rounded-2xl border border-gray-200 bg-white p-5 ${compact ? "" : "min-h-[160px]"}`}
    >
      <div className={`flex items-start gap-3 ${compact ? "" : "h-full"}`}>
        <Avatar className="size-11 shrink-0 rounded-full border border-gray-100">
          {reviewerAvatarUrl ? (
            <AvatarImage
              src={reviewerAvatarUrl}
              alt={review.reviewerName}
              className="object-cover"
            />
          ) : null}
          <AvatarFallback className="rounded-full bg-linear-to-br from-violet-500 to-indigo-600 text-xs font-bold text-white">
            {initials(review.reviewerName)}
          </AvatarFallback>
        </Avatar>

        <div
          className={`flex flex-1 flex-col gap-2 ${compact ? "" : "h-full"}`}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex-1">
              <p className="font-bold text-gray-900">{review.reviewerName}</p>
              <div className="flex items-center gap-2">
                <ReviewStarRating
                  rating={review.rating}
                  readonly
                  size={14}
                  gap={2}
                />
                <span className="text-xs text-gray-500">
                  {formatDateDMY(review.createdAt)}
                </span>
                {isEdited ? (
                  <span className="text-xs text-gray-500">(edited)</span>
                ) : null}
              </div>
            </div>
            {isOwnReview && onEdit ? (
              <Button variant="outline" size="icon-sm" onClick={onEdit}>
                <Edit2 size={16} className="text-gray-600" />
              </Button>
            ) : null}
          </div>

          <div className={compact ? "" : "flex-1"}>
            <p className={`text-sm leading-6 text-gray-600 ${isExpanded ? "" : "line-clamp-4"}`}>
              {displayComment}
            </p>
          </div>

          {shouldTruncate && !showFullComment ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-auto self-start px-0"
            >
              <span className="text-xs text-violet-600">
                {isExpanded ? t("showLess") : t("showMore")}
              </span>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
