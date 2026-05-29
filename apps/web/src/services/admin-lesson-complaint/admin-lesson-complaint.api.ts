import type {
  AdminLessonComplaintListItem,
  AdminLessonComplaintMetrics,
  LessonComplaintStatusFilter,
  ReviewLessonComplaintBody,
  ReviewLessonComplaintResult,
} from "@mezon-tutors/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api-client";
import { adminLessonComplaintQueryKey } from "./admin-lesson-complaint.qkey";
import { walletQueryKey } from "../wallet/wallet.qkey";

const BASE = "/admin";

export const adminLessonComplaintApi = {
  list(status?: LessonComplaintStatusFilter): Promise<AdminLessonComplaintListItem[]> {
    const query = status && status !== "all" ? `?status=${status}` : "";
    return apiClient.get<AdminLessonComplaintListItem[]>(
      `${BASE}/lesson-complaints${query}`,
    );
  },

  metrics(): Promise<AdminLessonComplaintMetrics> {
    return apiClient.get<AdminLessonComplaintMetrics>(
      `${BASE}/lesson-complaints/metrics`,
    );
  },

  approve(
    id: string,
    body: ReviewLessonComplaintBody,
  ): Promise<ReviewLessonComplaintResult> {
    return apiClient.post<ReviewLessonComplaintResult>(
      `${BASE}/lesson-complaints/${id}/approve`,
      body,
    );
  },

  reject(
    id: string,
    body: ReviewLessonComplaintBody,
  ): Promise<ReviewLessonComplaintResult> {
    return apiClient.post<ReviewLessonComplaintResult>(
      `${BASE}/lesson-complaints/${id}/reject`,
      body,
    );
  },
};

export const useAdminLessonComplaints = (
  status?: LessonComplaintStatusFilter,
  enabled = true,
) => {
  return useQuery({
    queryKey: adminLessonComplaintQueryKey.list(status),
    queryFn: () => adminLessonComplaintApi.list(status),
    enabled,
    staleTime: 30 * 1000,
  });
};

export const useAdminLessonComplaintMetrics = (enabled = true) => {
  return useQuery({
    queryKey: adminLessonComplaintQueryKey.metrics(),
    queryFn: () => adminLessonComplaintApi.metrics(),
    enabled,
    staleTime: 60 * 1000,
  });
};

export const useApproveLessonComplaint = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body?: ReviewLessonComplaintBody }) =>
      adminLessonComplaintApi.approve(id, body ?? {}),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: adminLessonComplaintQueryKey.all });
      if (data.refunded) {
        queryClient.invalidateQueries({ queryKey: walletQueryKey.all });
      }
    },
  });
};

export const useRejectLessonComplaint = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body?: ReviewLessonComplaintBody }) =>
      adminLessonComplaintApi.reject(id, body ?? {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminLessonComplaintQueryKey.all });
    },
  });
};
