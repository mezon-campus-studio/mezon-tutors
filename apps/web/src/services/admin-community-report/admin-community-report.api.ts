import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api-client';
import { adminCommunityReportQueryKey } from './admin-community-report.qkey';
import { communityQueryKey } from '../community/community.qkey';

const BASE = '/admin/community/reports';

export type AdminCommunityReportItem = {
  id: string;
  reason: string;
  description: string | null;
  status: string;
  createdAt: string;
  reporter: { id: string; username: string; avatar: string };
  post: {
    id: string;
    content: string;
    publishedAt: string;
    author: { id: string; username: string; avatar: string };
  } | null;
};

export const adminCommunityReportApi = {
  list: (status?: string) => {
    const query = status && status !== 'all' ? `?status=${status}` : '';
    return apiClient.get<AdminCommunityReportItem[]>(
      `${BASE}${query}`,
    );
  },
  approve: (id: string) =>
    apiClient.post<{ success: true }>(`${BASE}/${id}/approve`, {}),
  dismiss: (id: string) =>
    apiClient.post<{ success: true }>(`${BASE}/${id}/dismiss`, {}),
};

export const useAdminCommunityReports = (status?: string, enabled = true) =>
  useQuery({
    queryKey: adminCommunityReportQueryKey.list(status),
    queryFn: () => adminCommunityReportApi.list(status),
    enabled,
  });

export const useApproveCommunityReport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminCommunityReportApi.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: adminCommunityReportQueryKey.all,
      });
    },
  });
};

export const useDismissCommunityReport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminCommunityReportApi.dismiss(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: adminCommunityReportQueryKey.all,
      });
    },
  });
};

export const useHideCommunityPost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) =>
      apiClient.post<{ success: true }>(`${BASE}/hide-post/${postId}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communityQueryKey.all });
    },
  });
};
