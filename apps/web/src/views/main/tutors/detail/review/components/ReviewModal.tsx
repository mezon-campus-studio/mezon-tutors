'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { REVIEW_VALIDATION } from '@mezon-tutors/shared';
import { Button, Textarea, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui';
import { useCreateReview, useUpdateReview, type ReviewDto } from '@/services';
import { ReviewStarRating } from './ReviewStarRating';

interface ReviewModalProps {
  tutorId: string;
  tutorName: string;
  existingReview?: (ReviewDto | {
    id: string;
    reviewerId: string;
    rating: number;
    comment: string;
    createdAt: string;
    updatedAt?: string;
  }) | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ReviewModal({
  tutorId,
  tutorName,
  existingReview,
  isOpen,
  onClose,
}: ReviewModalProps) {
  const t = useTranslations('Tutors.Detail');
  const [rating, setRating] = useState(existingReview?.rating || 5);
  const [comment, setComment] = useState(existingReview?.comment || '');
  const [error, setError] = useState('');

  const createReview = useCreateReview();
  const updateReview = useUpdateReview();

  useEffect(() => {
    if (existingReview) {
      setRating(existingReview.rating);
      setComment(existingReview.comment);
    } else {
      setRating(5);
      setComment('');
    }
  }, [existingReview, isOpen]);

  const validateComment = (text: string): boolean => {
    const trimmed = text.trim();
    if (trimmed.length < REVIEW_VALIDATION.MIN_COMMENT_LENGTH) {
      setError(t('reviewModal.errors.commentTooShort', { min: REVIEW_VALIDATION.MIN_COMMENT_LENGTH }));
      return false;
    }
    if (trimmed.length > REVIEW_VALIDATION.MAX_COMMENT_LENGTH) {
      setError(t('reviewModal.errors.commentTooLong', { max: REVIEW_VALIDATION.MAX_COMMENT_LENGTH }));
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = async () => {
    if (!validateComment(comment)) return;

    try {
      if (existingReview) {
        await updateReview.mutateAsync({
          reviewId: existingReview.id,
          data: { rating, comment: comment.trim() },
          tutorId,
        });
      } else {
        await createReview.mutateAsync({
          tutorId,
          rating,
          comment: comment.trim(),
        });
      }
      onClose();
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message;
      if (errorMessage) {
        setError(errorMessage);
      } else {
        setError(t('reviewModal.errors.submitFailed'));
      }
    }
  };

  const isLoading = createReview.isPending || updateReview.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[500px] w-[90%] p-5 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900">
            {existingReview ? t('reviewModal.editTitle') : t('reviewModal.postTitle')}
          </DialogTitle>
          <p className="text-sm text-gray-600">
            {t('reviewModal.forTutor', { tutorName })}
          </p>
        </DialogHeader>

        <div className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-3">
            <label className="text-gray-900 font-semibold text-sm">
              {t('reviewModal.ratingLabel')}
            </label>
            <ReviewStarRating 
              rating={rating} 
              onRatingChange={setRating} 
              size={32}
              gap={8}
            />
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <label className="text-gray-900 font-semibold text-sm">
                {t('reviewModal.commentLabel')}
              </label>
              <span className="text-xs text-gray-500">
                {comment.trim().length}/{REVIEW_VALIDATION.MAX_COMMENT_LENGTH}
              </span>
            </div>
            <Textarea
              value={comment}
              onChange={(e) => {
                setComment(e.target.value);
                if (error) validateComment(e.target.value);
              }}
              placeholder={t('reviewModal.placeholderComment', {
                min: REVIEW_VALIDATION.MIN_COMMENT_LENGTH,
                max: REVIEW_VALIDATION.MAX_COMMENT_LENGTH,
              })}
              className="min-h-[120px] bg-gray-50 border-gray-200 text-gray-900 text-sm p-3 rounded-xl resize-none"
              maxLength={REVIEW_VALIDATION.MAX_COMMENT_LENGTH}
            />
            {error && (
              <p className="text-sm text-red-600 mt-1">
                {error}
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="flex gap-3 justify-end mt-3">
          <Button
            variant="outline"
            disabled={isLoading}
            onClick={onClose}
            className="px-5 py-3 rounded-lg"
          >
            {t('reviewModal.cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !comment.trim()}
            className="bg-indigo-600 text-white hover:bg-indigo-700 px-5 py-3 rounded-lg"
          >
            {isLoading ? t('reviewModal.submitting') : existingReview ? t('reviewModal.update') : t('reviewModal.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
