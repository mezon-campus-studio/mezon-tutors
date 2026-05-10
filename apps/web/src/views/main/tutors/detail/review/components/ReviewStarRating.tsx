"use client";

import { REVIEW_VALIDATION } from "@mezon-tutors/shared";
import { Star } from "lucide-react";

interface ReviewStarRatingProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  readonly?: boolean;
  size?: number;
  gap?: number;
}

export function ReviewStarRating({
  rating,
  onRatingChange,
  readonly = false,
  size = 24,
  gap = 4,
}: ReviewStarRatingProps) {
  const handleStarClick = (star: number) => {
    if (!readonly && onRatingChange) {
      onRatingChange(star);
    }
  };

  const renderStar = (index: number) => {
    const star = index + 1;
    const fillPercentage = Math.min(Math.max(rating - index, 0), 1);

    if (readonly && fillPercentage > 0 && fillPercentage < 1) {
      return (
        <div
          key={star}
          className="relative"
          style={{ width: size, height: size }}
        >
          <Star
            size={size}
            className="absolute top-0 left-0 text-gray-300"
            fill="none"
          />
          <div
            className="absolute top-0 left-0 overflow-hidden"
            style={{
              width: size,
              height: size,
              clipPath: `inset(0 ${100 - fillPercentage * 100}% 0 0)`,
            }}
          >
            <Star size={size} className="text-yellow-400" fill="currentColor" />
          </div>
        </div>
      );
    }

    const isActive = star <= Math.ceil(rating);
    return (
      <button
        key={star}
        type="button"
        onClick={() => handleStarClick(star)}
        disabled={readonly}
        className={`${readonly ? "cursor-default" : "cursor-pointer hover:scale-110 active:opacity-70"} transition-transform`}
      >
        <Star
          size={size}
          className={isActive ? "text-yellow-400" : "text-gray-300"}
          fill={isActive ? "currentColor" : "none"}
        />
      </button>
    );
  };

  return (
    <div className="flex items-center" style={{ gap }}>
      {Array.from({ length: REVIEW_VALIDATION.MAX_RATING }).map((_, index) =>
        renderStar(index),
      )}
    </div>
  );
}
