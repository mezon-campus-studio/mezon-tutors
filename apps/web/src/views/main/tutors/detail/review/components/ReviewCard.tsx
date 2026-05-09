'use client';

import { useState } from 'react';
import { Edit2 } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { formatDateDMY, REVIEW_AVATAR, REVIEW_DISPLAY_CONFIG } from '@mezon-tutors/shared';
import { Button } from '@/components/ui';
import { ReviewStarRating } from './ReviewStarRating';

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

export function ReviewCard({ review, showFullComment = false, isOwnReview = false, onEdit, compact = false }: ReviewCardProps) {
  const t = useTranslations('Tutors.Detail');
  const [isExpanded, setIsExpanded] = useState(showFullComment);
  
  const shouldTruncate = !showFullComment && review.comment.length > REVIEW_DISPLAY_CONFIG.COMMENT_PREVIEW_LENGTH;
  const displayComment = isExpanded || showFullComment
    ? review.comment
    : review.comment.slice(0, REVIEW_DISPLAY_CONFIG.COMMENT_PREVIEW_LENGTH) + (shouldTruncate ? '...' : '');

  const avatarUrl = review.reviewerAvatar || REVIEW_AVATAR.DEFAULT_URL;
  const isEdited = review.updatedAt && review.updatedAt !== review.createdAt;

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-4 ${compact ? '' : 'min-h-[180px]'}`}>
      <div className={`flex gap-3 items-start ${compact ? '' : 'h-full'}`}>
        <div className="relative w-11 h-11 rounded-full overflow-hidden flex-shrink-0 bg-gray-200">
          <Image
            src={avatarUrl}
            alt={review.reviewerName}
            fill
            className="object-cover"
          />
        </div>
        
        <div className={`flex-1 flex flex-col gap-2 ${compact ? '' : 'h-full'}`}>
          <div className="flex justify-between items-start gap-2 flex-wrap">
            <div className="flex-1">
              <p className="text-gray-900 font-bold">
                {review.reviewerName}
              </p>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500">
                  {formatDateDMY(review.createdAt)}
                </span>
                {isEdited && (
                  <span className="text-xs text-gray-500">
                    (edited)
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ReviewStarRating 
                rating={review.rating} 
                readonly 
                size={16}
                gap={2}
              />
              {isOwnReview && onEdit && (
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={onEdit}
                >
                  <Edit2 size={16} className="text-gray-600" />
                </Button>
              )}
            </div>
          </div>
          
          <div className={compact ? '' : 'flex-1'}>
            <p className={`text-gray-600 ${isExpanded ? '' : 'line-clamp-4'}`}>
              {displayComment}
            </p>
          </div>
          
          {shouldTruncate && !showFullComment && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-0 h-auto self-start"
            >
              <span className="text-xs text-indigo-600">
                {isExpanded ? t('showLess') : t('showMore')}
              </span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
