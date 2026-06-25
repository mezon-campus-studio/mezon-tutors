import type {
  BlogCommentDto,
  BlogEngagementDto,
  BlogListResultDto,
  BlogMetricsDto,
  BlogPostDetailDto,
  BlogPostListItemDto,
  BlogPublishStatusFilter,
  BlogTagListItemDto,
  CreateBlogCommentPayload,
  CreateBlogPayload,
  RejectBlogPayload,
  ToggleBlogUpvoteResultDto,
  ToggleCommentUpvoteResultDto,
} from "@mezon-tutors/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, apiClient, publicApiClient } from "@/services/api-client";
import { blogQueryKey, adminBlogQueryKey } from "./blog.qkey";

const BASE = "/blog";
const ADMIN_BASE = "/admin/blogs";

export const blogApi = {
  listPublished: (params?: { search?: string; page?: number; limit?: number }) =>
    publicApiClient.get<BlogListResultDto>(BASE, { params }),
  getBySlug: (slug: string) =>
    publicApiClient.get<BlogPostDetailDto>(`${BASE}/${encodeURIComponent(slug)}`),
  listTags: () => publicApiClient.get<BlogTagListItemDto[]>(`${BASE}/tags`),
  create: (payload: CreateBlogPayload) =>
    apiClient.post<BlogPostDetailDto>(BASE, payload),
  listMySubmissions: () =>
    apiClient.get<BlogPostListItemDto[]>(`${BASE}/submissions/mine`),
  getMySubmission: (id: string) =>
    apiClient.get<BlogPostDetailDto>(
      `${BASE}/submissions/mine/${encodeURIComponent(id)}`,
    ),
  updateMySubmission: (id: string, payload: CreateBlogPayload) =>
    apiClient.patch<BlogPostDetailDto>(
      `${BASE}/submissions/mine/${encodeURIComponent(id)}`,
      payload,
    ),
  adminList: (status?: BlogPublishStatusFilter) =>
    apiClient.get<BlogPostListItemDto[]>(
      status && status !== "all" ? `${ADMIN_BASE}?status=${status}` : ADMIN_BASE,
    ),
  adminMetrics: () => apiClient.get<BlogMetricsDto>(`${ADMIN_BASE}/metrics`),
  adminGetById: (id: string) =>
    apiClient.get<BlogPostDetailDto>(`${ADMIN_BASE}/${id}`),
  adminPublish: (id: string) =>
    apiClient.post<BlogPostDetailDto>(`${ADMIN_BASE}/${id}/publish`),
  adminReject: (id: string, payload: RejectBlogPayload) =>
    apiClient.post<BlogPostDetailDto>(`${ADMIN_BASE}/${id}/reject`, payload),
  adminClose: (id: string) =>
    apiClient.post<BlogPostDetailDto>(`${ADMIN_BASE}/${id}/close`),
  adminApproveUpdate: (id: string) =>
    apiClient.post<BlogPostDetailDto>(`${ADMIN_BASE}/${id}/approve-update`),
  adminRejectUpdate: (id: string, payload: RejectBlogPayload) =>
    apiClient.post<BlogPostDetailDto>(
      `${ADMIN_BASE}/${id}/reject-update`,
      payload,
    ),
  listComments: (slug: string) =>
    apiClient.get<BlogCommentDto[]>(
      `${BASE}/${encodeURIComponent(slug)}/comments`,
    ),
  getEngagement: (slug: string) =>
    apiClient.get<BlogEngagementDto>(
      `${BASE}/${encodeURIComponent(slug)}/engagement`,
    ),
  toggleUpvote: (slug: string) =>
    apiClient.post<ToggleBlogUpvoteResultDto>(
      `${BASE}/${encodeURIComponent(slug)}/upvote`,
    ),
  createComment: (slug: string, payload: CreateBlogCommentPayload) =>
    apiClient.post<BlogCommentDto>(
      `${BASE}/${encodeURIComponent(slug)}/comments`,
      payload,
    ),
  deleteComment: (slug: string, commentId: string) =>
    apiClient.delete<{ success: true }>(
      `${BASE}/${encodeURIComponent(slug)}/comments/${encodeURIComponent(commentId)}`,
    ),
  toggleCommentUpvote: (slug: string, commentId: string) =>
    apiClient.post<ToggleCommentUpvoteResultDto>(
      `${BASE}/${encodeURIComponent(slug)}/comments/${encodeURIComponent(commentId)}/upvote`,
    ),
};

export const usePublishedBlogs = (
  params?: { search?: string; page?: number; limit?: number },
  enabled = true,
) =>
  useQuery({
    queryKey: blogQueryKey.list(params),
    queryFn: () => blogApi.listPublished(params),
    enabled,
    refetchOnWindowFocus: true,
  });

export const useBlogDetail = (slug: string, enabled = true) =>
  useQuery({
    queryKey: blogQueryKey.detail(slug),
    queryFn: () => blogApi.getBySlug(slug),
    enabled: enabled && Boolean(slug),
  });

export const useBlogTags = (enabled = true) =>
  useQuery({
    queryKey: blogQueryKey.tags(),
    queryFn: () => blogApi.listTags(),
    enabled,
    staleTime: 60_000,
  });

export const useCreateBlog = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateBlogPayload) => blogApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blogQueryKey.all });
    },
  });
};

export const useMyBlogSubmissions = (enabled = true) =>
  useQuery({
    queryKey: blogQueryKey.mySubmissions(),
    queryFn: () => blogApi.listMySubmissions(),
    enabled,
  });

export const useMyBlogSubmission = (id: string, enabled = true) =>
  useQuery({
    queryKey: blogQueryKey.mySubmission(id),
    queryFn: () => blogApi.getMySubmission(id),
    enabled: enabled && Boolean(id),
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 429) {
        return false;
      }
      return failureCount < 2;
    },
  });

export const useUpdateBlog = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CreateBlogPayload }) =>
      blogApi.updateMySubmission(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: blogQueryKey.all });
      queryClient.invalidateQueries({
        queryKey: blogQueryKey.mySubmission(variables.id),
      });
    },
  });
};

export const useAdminBlogs = (
  status?: BlogPublishStatusFilter,
  enabled = true,
) =>
  useQuery({
    queryKey: adminBlogQueryKey.list(status),
    queryFn: () => blogApi.adminList(status),
    enabled,
  });

export const useAdminBlogMetrics = (enabled = true) =>
  useQuery({
    queryKey: adminBlogQueryKey.metrics(),
    queryFn: () => blogApi.adminMetrics(),
    enabled,
  });

export const useAdminBlogDetail = (id: string, enabled = true) =>
  useQuery({
    queryKey: adminBlogQueryKey.detail(id),
    queryFn: () => blogApi.adminGetById(id),
    enabled: enabled && Boolean(id),
  });

export const usePublishBlog = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => blogApi.adminPublish(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: adminBlogQueryKey.all });
      queryClient.invalidateQueries({ queryKey: adminBlogQueryKey.detail(id) });
      queryClient.invalidateQueries({ queryKey: blogQueryKey.all });
    },
  });
};

export const useRejectBlog = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      blogApi.adminReject(id, { reason }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: adminBlogQueryKey.all });
      queryClient.invalidateQueries({ queryKey: adminBlogQueryKey.detail(id) });
      queryClient.invalidateQueries({ queryKey: blogQueryKey.all });
    },
  });
};

export const useCloseBlog = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => blogApi.adminClose(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: adminBlogQueryKey.all });
      queryClient.invalidateQueries({ queryKey: adminBlogQueryKey.detail(id) });
      queryClient.invalidateQueries({ queryKey: blogQueryKey.all });
    },
  });
};

export const useApproveBlogUpdate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => blogApi.adminApproveUpdate(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: adminBlogQueryKey.all });
      queryClient.invalidateQueries({ queryKey: adminBlogQueryKey.detail(id) });
      queryClient.invalidateQueries({ queryKey: blogQueryKey.all });
    },
  });
};

export const useRejectBlogUpdate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      blogApi.adminRejectUpdate(id, { reason }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: adminBlogQueryKey.all });
      queryClient.invalidateQueries({ queryKey: adminBlogQueryKey.detail(id) });
      queryClient.invalidateQueries({ queryKey: blogQueryKey.all });
    },
  });
};

export const useBlogComments = (slug: string, enabled = true) =>
  useQuery({
    queryKey: blogQueryKey.comments(slug),
    queryFn: () => blogApi.listComments(slug),
    enabled: enabled && Boolean(slug),
  });

export const useBlogEngagement = (slug: string, enabled = true) =>
  useQuery({
    queryKey: blogQueryKey.engagement(slug),
    queryFn: () => blogApi.getEngagement(slug),
    enabled: enabled && Boolean(slug),
  });

export const useToggleBlogUpvote = (slug: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => blogApi.toggleUpvote(slug),
    onSuccess: (data) => {
      queryClient.setQueryData(blogQueryKey.engagement(slug), (current: BlogEngagementDto | undefined) =>
        current
          ? { ...current, isUpvoted: data.upvoted, upvoteCount: data.upvoteCount }
          : {
              isUpvoted: data.upvoted,
              upvoteCount: data.upvoteCount,
              commentCount: 0,
            },
      );
      queryClient.setQueryData(blogQueryKey.detail(slug), (current: BlogPostDetailDto | undefined) =>
        current ? { ...current, upvoteCount: data.upvoteCount } : current,
      );
    },
  });
};

export const useCreateBlogComment = (slug: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateBlogCommentPayload) =>
      blogApi.createComment(slug, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blogQueryKey.comments(slug) });
      queryClient.setQueryData(
        blogQueryKey.engagement(slug),
        (current: BlogEngagementDto | undefined) =>
          current
            ? { ...current, commentCount: current.commentCount + 1 }
            : current,
      );
      queryClient.setQueryData(blogQueryKey.detail(slug), (current: BlogPostDetailDto | undefined) =>
        current
          ? { ...current, commentCount: current.commentCount + 1 }
          : current,
      );
    },
  });
};

export const useDeleteBlogComment = (slug: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => blogApi.deleteComment(slug, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blogQueryKey.comments(slug) });
      queryClient.setQueryData(
        blogQueryKey.engagement(slug),
        (current: BlogEngagementDto | undefined) =>
          current
            ? { ...current, commentCount: Math.max(0, current.commentCount - 1) }
            : current,
      );
      queryClient.setQueryData(blogQueryKey.detail(slug), (current: BlogPostDetailDto | undefined) =>
        current
          ? { ...current, commentCount: Math.max(0, current.commentCount - 1) }
          : current,
      );
    },
  });
};

export const useToggleCommentUpvote = (slug: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => blogApi.toggleCommentUpvote(slug, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blogQueryKey.comments(slug) });
    },
  });
};
