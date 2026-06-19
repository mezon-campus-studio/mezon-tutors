import type {
  CreateVocabularyWordBody,
  UpdateVocabularyWordStatusBody,
  VocabularyWordItem,
  VocabularyWordStatus,
} from '@mezon-tutors/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiClient } from '../api-client';
import { vocabularyQueryKey } from './vocabulary.qkey';

const BASE = '/vocabulary';

export class VocabularyAlreadyAddedError extends Error {
  constructor() {
    super('already_added');
    this.name = 'VocabularyAlreadyAddedError';
  }
}

export const vocabularyApi = {
  getVocabulary(): Promise<VocabularyWordItem[]> {
    return apiClient.get<VocabularyWordItem[]>(BASE);
  },

  async addWord(dto: CreateVocabularyWordBody): Promise<VocabularyWordItem> {
    try {
      return await apiClient.post<VocabularyWordItem>(BASE, dto);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        throw new VocabularyAlreadyAddedError();
      }
      throw error;
    }
  },

  updateWordStatus(
    id: string,
    status: VocabularyWordStatus,
  ): Promise<VocabularyWordItem> {
    const body: UpdateVocabularyWordStatusBody = { status };
    return apiClient.put<VocabularyWordItem>(`${BASE}/${id}/status`, body);
  },

  deleteWord(id: string): Promise<void> {
    return apiClient.delete<void>(`${BASE}/${id}`);
  },
};

export const useGetVocabulary = (enabled = true) =>
  useQuery({
    queryKey: vocabularyQueryKey.list(),
    queryFn: () => vocabularyApi.getVocabulary(),
    enabled,
  });

export const useAddWordMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateVocabularyWordBody) => vocabularyApi.addWord(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vocabularyQueryKey.all });
    },
  });
};

export const useUpdateWordStatusMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: VocabularyWordStatus;
    }) => vocabularyApi.updateWordStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vocabularyQueryKey.all });
    },
  });
};

export const useDeleteWordMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => vocabularyApi.deleteWord(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vocabularyQueryKey.all });
    },
  });
};
