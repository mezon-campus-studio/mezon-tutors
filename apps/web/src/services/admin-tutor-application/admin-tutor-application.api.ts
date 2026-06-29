import type {
  AdminLessonChangeHistoryItem,
  FullTutorApplication,
  TutorAdminNote,
  TutorAdminStatsResponse,
  TutorApplicationMetrics,
  TutorProfile,
} from "@mezon-tutors/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api-client";
import { adminTutorApplicationQueryKey } from "./admin-tutor-application.qkey";

const BASE = "/admin";

export type CreateAdminNotePayload = {
  tutorId: string;
  reviewerId: string;
  reviewerName: string;
  content: string;
};

export type TutorApplicationDecisionPayload = {
  id: string;
  note?: string;
};

export const adminTutorApplicationApi = {
  list(): Promise<TutorProfile[]> {
    return apiClient.get<TutorProfile[]>(`${BASE}/tutor-applications`);
  },

  metrics(): Promise<TutorApplicationMetrics> {
    return apiClient.get<TutorApplicationMetrics>(
      `${BASE}/tutor-applications/metrics`,
    );
  },

  detail(id: string): Promise<FullTutorApplication> {
    return apiClient.get<FullTutorApplication>(`${BASE}/tutor-profiles/${id}`);
  },

  lessonChangeHistory(tutorId: string): Promise<AdminLessonChangeHistoryItem[]> {
    return apiClient.get<AdminLessonChangeHistoryItem[]>(
      `${BASE}/tutor-profiles/${tutorId}/lesson-change-history`,
    );
  },

  stats(tutorProfileId: string): Promise<TutorAdminStatsResponse> {
    return apiClient.get<TutorAdminStatsResponse>(
      `${BASE}/tutor-profiles/${tutorProfileId}/stats`,
    );
  },

  approve(id: string, note?: string): Promise<{ success: boolean }> {
    return apiClient.post<{ success: boolean }>(
      `${BASE}/tutor-applications/${id}/approve`,
      note?.trim() ? { note: note.trim() } : {},
    );
  },

  reject(id: string, note?: string): Promise<{ success: boolean }> {
    return apiClient.post<{ success: boolean }>(
      `${BASE}/tutor-applications/${id}/reject`,
      note?.trim() ? { note: note.trim() } : {},
    );
  },

  createAdminNote(payload: CreateAdminNotePayload): Promise<TutorAdminNote> {
    return apiClient.post<TutorAdminNote>(`${BASE}/tutor-admin-notes`, payload);
  },
};

export const useAdminTutorApplications = (enabled = true) => {
  return useQuery({
    queryKey: adminTutorApplicationQueryKey.list(),
    queryFn: () => adminTutorApplicationApi.list(),
    enabled,
  });
};

export const useAdminTutorApplicationMetrics = (enabled = true) => {
  return useQuery({
    queryKey: adminTutorApplicationQueryKey.metrics(),
    queryFn: () => adminTutorApplicationApi.metrics(),
    enabled,
  });
};

export const useAdminTutorApplicationDetail = (id: string, enabled = true) => {
  return useQuery({
    queryKey: adminTutorApplicationQueryKey.detail(id),
    queryFn: () => adminTutorApplicationApi.detail(id),
    enabled: enabled && !!id,
  });
};

export const useAdminTutorLessonChangeHistory = (
  tutorId: string,
  enabled = true,
) => {
  return useQuery({
    queryKey: adminTutorApplicationQueryKey.lessonChangeHistory(tutorId),
    queryFn: () => adminTutorApplicationApi.lessonChangeHistory(tutorId),
    enabled: enabled && !!tutorId,
  });
};

export const useAdminTutorStats = (tutorProfileId: string, enabled = true) => {
  return useQuery({
    queryKey: adminTutorApplicationQueryKey.stats(tutorProfileId),
    queryFn: () => adminTutorApplicationApi.stats(tutorProfileId),
    enabled: enabled && !!tutorProfileId,
  });
};

export const useApproveTutorApplication = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: TutorApplicationDecisionPayload) =>
      adminTutorApplicationApi.approve(id, note),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({
        queryKey: adminTutorApplicationQueryKey.list(),
      });
      queryClient.invalidateQueries({
        queryKey: adminTutorApplicationQueryKey.metrics(),
      });
      queryClient.invalidateQueries({
        queryKey: adminTutorApplicationQueryKey.detail(id),
      });
    },
  });
};

export const useRejectTutorApplication = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: TutorApplicationDecisionPayload) =>
      adminTutorApplicationApi.reject(id, note),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({
        queryKey: adminTutorApplicationQueryKey.list(),
      });
      queryClient.invalidateQueries({
        queryKey: adminTutorApplicationQueryKey.metrics(),
      });
      queryClient.invalidateQueries({
        queryKey: adminTutorApplicationQueryKey.detail(id),
      });
    },
  });
};

export const useCreateAdminNote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAdminNotePayload) =>
      adminTutorApplicationApi.createAdminNote(payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: adminTutorApplicationQueryKey.detail(variables.tutorId),
      });
    },
  });
};
