import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient as api } from '@/services/api-client';
import { learningLogQueryKey } from './learning-log.qkey';

export type ELearningAction = 'READY_TO_LEARNING' | 'LEARNING_TO_LEARNED';

type LogLearningParams = {
  vocabularyWordId: string;
  action: ELearningAction;
};

export type HeatmapDataPoint = {
  date: string;
  count: number;
};

export type LearningHeatmapResponse = {
  heatmap: HeatmapDataPoint[];
  totalWords: number;
  currentStreak: number;
  longestStreak: number;
};

export const learningLogApi = {
  logLearning: (data: LogLearningParams) => 
    api.post<unknown>('/learning-logs', data),

  getHeatmap: (months?: number): Promise<LearningHeatmapResponse> =>
    api.get<LearningHeatmapResponse>('/learning-logs/heatmap', { params: { months } }),
};

export const useLogLearning = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: learningLogApi.logLearning,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: learningLogQueryKey.all });
    },
  });
};

export const useGetLearningHeatmap = (months?: number) => {
  return useQuery({
    queryKey: learningLogQueryKey.heatmap(months),
    queryFn: () => learningLogApi.getHeatmap(months),
  });
};
