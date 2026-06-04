import type {
  LessonComplaintStatusFilter,
  TutorConfirmLessonComplaintResult,
  TutorLessonComplaintListItem,
  TutorRejectLessonComplaintBody,
  TutorRejectLessonComplaintResult,
} from "@mezon-tutors/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api-client";

const BASE = "/tutor/lesson-complaints";

export const tutorLessonComplaintQueryKey = {
  all: ["tutor-lesson-complaints"] as const,
  list: () => [...tutorLessonComplaintQueryKey.all, "list"] as const,
};

export const tutorLessonComplaintApi = {
  list(): Promise<TutorLessonComplaintListItem[]> {
    return apiClient.get<TutorLessonComplaintListItem[]>(BASE);
  },

  confirm(id: string): Promise<TutorConfirmLessonComplaintResult> {
    return apiClient.post<TutorConfirmLessonComplaintResult>(`${BASE}/${id}/confirm`, {});
  },

  reject(id: string, body: TutorRejectLessonComplaintBody): Promise<TutorRejectLessonComplaintResult> {
    return apiClient.post<TutorRejectLessonComplaintResult>(`${BASE}/${id}/reject`, body);
  },
};

export const useTutorLessonComplaints = (enabled = true) => {
  return useQuery({
    queryKey: tutorLessonComplaintQueryKey.list(),
    queryFn: () => tutorLessonComplaintApi.list(),
    enabled,
    staleTime: 30 * 1000,
  });
};

export const useConfirmTutorLessonComplaint = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tutorLessonComplaintApi.confirm(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tutorLessonComplaintQueryKey.all });
      queryClient.invalidateQueries({ queryKey: ["my-lessons"] });
    },
  });
};

export const useRejectTutorLessonComplaint = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body?: TutorRejectLessonComplaintBody }) =>
      tutorLessonComplaintApi.reject(id, body ?? {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tutorLessonComplaintQueryKey.all });
      queryClient.invalidateQueries({ queryKey: ["my-lessons"] });
    },
  });
};

export function filterTutorComplaintsByStatus(
  items: TutorLessonComplaintListItem[],
  status: LessonComplaintStatusFilter,
): TutorLessonComplaintListItem[] {
  if (status === "all") return items;
  return items.filter((item) => item.status === status);
}
