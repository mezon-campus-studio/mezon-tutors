import { useMemo } from 'react';
import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query';
import { ApiResponse } from '@mezon-tutors/shared';
import { useAtomValue } from 'jotai';
import { userAtom } from '@/store/auth.atom';
import { apiClient } from '../api-client';
import { tutorProfileQueryKey } from '../tutor-profile/tutor-profile.qkey';
import { tutorProfileApi } from '../tutor-profile/tutor-profile.api';
import { reviewQueryKey } from './review.qkey';

export interface CreateReviewDto {
  tutorId: string;
  rating: number;
  comment: string;
}

export interface UpdateReviewDto {
  rating: number;
  comment: string;
}

export interface ReviewDto {
  id: string;
  tutorId: string;
  reviewerId: string;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
}

export const reviewApi = {
  createReview(data: CreateReviewDto): Promise<ReviewDto> {
    return apiClient.post<ApiResponse<ReviewDto>, ReviewDto>('/reviews', data);
  },

  updateReview(reviewId: string, data: UpdateReviewDto): Promise<ReviewDto> {
    return apiClient.put<ApiResponse<ReviewDto>, ReviewDto>(`/reviews/${reviewId}`, data);
  },
};

const useCreateReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateReviewDto) => reviewApi.createReview(data),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: reviewQueryKey.tutorReviews(variables.tutorId) });
      await queryClient.cancelQueries({ queryKey: reviewQueryKey.tutorAbout(variables.tutorId) });

      const previousReviews = queryClient.getQueryData(reviewQueryKey.tutorReviews(variables.tutorId));
      const previousAbout = queryClient.getQueryData(reviewQueryKey.tutorAbout(variables.tutorId));

      return { previousReviews, previousAbout };
    },
    onError: (_err, variables, context) => {
      if (context?.previousReviews) {
        queryClient.setQueryData(reviewQueryKey.tutorReviews(variables.tutorId), context.previousReviews);
      }
      if (context?.previousAbout) {
        queryClient.setQueryData(reviewQueryKey.tutorAbout(variables.tutorId), context.previousAbout);
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: reviewQueryKey.tutorReviews(variables.tutorId) });
      queryClient.invalidateQueries({ queryKey: reviewQueryKey.tutorAbout(variables.tutorId) });
    },
  });
};

const useUpdateReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reviewId, data }: { reviewId: string; data: UpdateReviewDto; tutorId: string }) =>
      reviewApi.updateReview(reviewId, data),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: reviewQueryKey.tutorReviews(variables.tutorId) });
      await queryClient.cancelQueries({ queryKey: reviewQueryKey.tutorAbout(variables.tutorId) });

      const previousReviews = queryClient.getQueryData(reviewQueryKey.tutorReviews(variables.tutorId));
      const previousAbout = queryClient.getQueryData(reviewQueryKey.tutorAbout(variables.tutorId));

      return { previousReviews, previousAbout };
    },
    onError: (_err, variables, context) => {
      if (context?.previousReviews) {
        queryClient.setQueryData(reviewQueryKey.tutorReviews(variables.tutorId), context.previousReviews);
      }
      if (context?.previousAbout) {
        queryClient.setQueryData(reviewQueryKey.tutorAbout(variables.tutorId), context.previousAbout);
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: reviewQueryKey.tutorReviews(variables.tutorId) });
      queryClient.invalidateQueries({ queryKey: reviewQueryKey.tutorAbout(variables.tutorId) });
    },
  });
};

const useMyReviewsForTutors = (tutorIds: string[]) => {
  const currentUser = useAtomValue(userAtom);
  const currentUserId = currentUser?.id;

  const uniqueTutorIds = useMemo(() => [...new Set(tutorIds.filter(Boolean))], [tutorIds]);

  const queries = useQueries({
    queries: uniqueTutorIds.map((id) => ({
      queryKey: tutorProfileQueryKey.tutorReviews(id),
      queryFn: () => tutorProfileApi.getVerifiedTutorReviews(id),
      enabled: !!id,
      refetchOnMount: true,
      refetchOnWindowFocus: false,
    })),
  });

  const isFetching = queries.some((q) => q.isFetching);

  return useMemo(() => {
    const map = new Map<string, ReviewDto | null>();
    uniqueTutorIds.forEach((id, index) => {
      const data = queries[index]?.data;
      if (data?.reviews && currentUserId) {
        const myReview = data.reviews.find((r) => r.reviewerId === currentUserId);
        if (myReview) {
          map.set(id, {
            id: myReview.id,
            tutorId: id,
            reviewerId: myReview.reviewerId,
            rating: myReview.rating,
            comment: myReview.comment,
            createdAt: myReview.createdAt,
            updatedAt: myReview.updatedAt,
          });
        } else {
          map.set(id, null);
        }
      } else {
        map.set(id, null);
      }
    });
    return { map, isFetching };
  }, [queries, uniqueTutorIds, currentUserId, isFetching]);
};

export { useCreateReview, useUpdateReview, useMyReviewsForTutors };
