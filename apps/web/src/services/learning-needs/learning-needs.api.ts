import type {
  CurrentLearningNeedsPinDto,
  LearningNeedsAnswersV1,
  LearningNeedsBookingDto,
} from '@mezon-tutors/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api-client';
import { learningNeedsQueryKey } from './learning-needs.qkey';

export const learningNeedsApi = {
  getForBooking: (bookingId: string): Promise<LearningNeedsBookingDto> =>
    apiClient.get(`/learning-needs/bookings/${bookingId}`),
  saveDraft: (
    bookingId: string,
    answers: LearningNeedsAnswersV1,
    expectedDraftRevision?: number
  ): Promise<LearningNeedsBookingDto> =>
    apiClient.put(`/learning-needs/bookings/${bookingId}/draft`, {
      answers,
      expectedDraftRevision,
    }),
  share: (bookingId: string, expectedDraftRevision: number): Promise<LearningNeedsBookingDto> =>
    apiClient.post(`/learning-needs/bookings/${bookingId}/share`, { expectedDraftRevision }),
  getCurrentForChannel: (channelId: string): Promise<CurrentLearningNeedsPinDto> =>
    apiClient.get(`/learning-needs/channels/${encodeURIComponent(channelId)}/current`),
  associateChannel: (recordId: string, channelId: string): Promise<LearningNeedsBookingDto> =>
    apiClient.post(`/learning-needs/${recordId}/channel-association`, { channelId }),
  recordSyncFailure: (recordId: string, error: string): Promise<{ ok: boolean }> =>
    apiClient.post(`/learning-needs/${recordId}/sync-failure`, { error }),
};

export function useLearningNeedsForBooking(bookingId: string, enabled = true) {
  return useQuery({
    queryKey: learningNeedsQueryKey.booking(bookingId),
    queryFn: () => learningNeedsApi.getForBooking(bookingId),
    enabled: Boolean(bookingId) && enabled,
  });
}

export function useGetCurrentLearningNeedsPin(channelId: string, enabled = true) {
  return useQuery({
    queryKey: learningNeedsQueryKey.channel(channelId),
    queryFn: () => learningNeedsApi.getCurrentForChannel(channelId),
    enabled: Boolean(channelId) && enabled,
  });
}

export function useSaveLearningNeedsDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      bookingId,
      answers,
      expectedDraftRevision,
    }: { bookingId: string; answers: LearningNeedsAnswersV1; expectedDraftRevision?: number }) =>
      learningNeedsApi.saveDraft(bookingId, answers, expectedDraftRevision),
    onSuccess: (data) =>
      qc.setQueryData(learningNeedsQueryKey.booking(data.context.bookingId), data),
  });
}

export function useShareLearningNeeds() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      bookingId,
      expectedDraftRevision,
    }: { bookingId: string; expectedDraftRevision: number }) =>
      learningNeedsApi.share(bookingId, expectedDraftRevision),
    onSuccess: (data) => {
      qc.setQueryData(learningNeedsQueryKey.booking(data.context.bookingId), data);
      void qc.invalidateQueries({ queryKey: ['learning-needs', 'channel'] });
    },
  });
}
