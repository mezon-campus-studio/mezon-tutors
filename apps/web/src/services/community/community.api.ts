import type {
  CommunityCommentDto,
  CommunityEngagementDto,
  CommunityExerciseSubmissionDto,
  CommunityFeedResultDto,
  CommunityFeedSort,
  CommunityPostDetailDto,
  CommunityPostListItemDto,
  CommunityPostType,
  CommunitySearchResultDto,
  CommunityTagListItemDto,
  CreateCommunityCommentPayload,
  CreateCommunityPostPayload,
  CreateCommunityReportPayload,
  CreateCommunitySubmissionPayload,
  ToggleCommunityFollowResultDto,
  ToggleCommunityUpvoteResultDto,
  UpdateCommunityPostPayload,
} from '@mezon-tutors/shared';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import { apiClient, publicApiClient } from '@/services/api-client';
import { communityQueryKey } from './community.qkey';

const BASE = '/community';

export const communityApi = {
  listFeed: (params?: {
    sort?: CommunityFeedSort;
    type?: CommunityPostType;
    tag?: string;
    authorId?: string;
    following?: boolean;
    cursor?: string;
    limit?: number;
  }) => apiClient.get<CommunityFeedResultDto>(`${BASE}/feed`, { params }),

  search: (params?: {
    q?: string;
    type?: CommunityPostType;
    tag?: string;
    authorId?: string;
    page?: number;
    limit?: number;
  }) => apiClient.get<CommunitySearchResultDto>(`${BASE}/search`, { params }),

  listTags: () => publicApiClient.get<CommunityTagListItemDto[]>(`${BASE}/tags`),

  getById: (id: string) =>
    apiClient.get<CommunityPostDetailDto>(`${BASE}/posts/${id}`),

  create: (payload: CreateCommunityPostPayload) =>
    apiClient.post<CommunityPostDetailDto>(`${BASE}/posts`, payload),

  update: (id: string, payload: UpdateCommunityPostPayload) =>
    apiClient.patch<CommunityPostDetailDto>(`${BASE}/posts/${id}`, payload),

  remove: (id: string) =>
    apiClient.delete<{ success: true }>(`${BASE}/posts/${id}`),

  listComments: (postId: string) =>
    apiClient.get<CommunityCommentDto[]>(`${BASE}/posts/${postId}/comments`),

  getEngagement: (postId: string) =>
    apiClient.get<CommunityEngagementDto>(`${BASE}/posts/${postId}/engagement`),

  toggleUpvote: (postId: string) =>
    apiClient.post<ToggleCommunityUpvoteResultDto>(`${BASE}/posts/${postId}/upvote`),

  toggleFollow: (userId: string) =>
    apiClient.post<ToggleCommunityFollowResultDto>(`${BASE}/users/${userId}/follow`),

  getFollowingIds: () =>
    apiClient.get<string[]>(`${BASE}/following/ids`),

  createComment: (postId: string, payload: CreateCommunityCommentPayload) =>
    apiClient.post<CommunityCommentDto>(`${BASE}/posts/${postId}/comments`, payload),

  deleteComment: (postId: string, commentId: string) =>
    apiClient.delete<{ success: true }>(
      `${BASE}/posts/${postId}/comments/${commentId}`,
    ),

  toggleCommentUpvote: (postId: string, commentId: string) =>
    apiClient.post<ToggleCommunityUpvoteResultDto>(
      `${BASE}/posts/${postId}/comments/${commentId}/upvote`,
    ),

  submitExercise: (postId: string, payload: CreateCommunitySubmissionPayload) =>
    apiClient.post<CommunityExerciseSubmissionDto>(
      `${BASE}/posts/${postId}/submissions`,
      payload,
    ),

  listMySubmissions: (postId: string) =>
    apiClient.get<CommunityExerciseSubmissionDto[]>(
      `${BASE}/posts/${postId}/submissions/mine`,
    ),

  createReport: (payload: CreateCommunityReportPayload) =>
    apiClient.post<{ success: true }>(`${BASE}/reports`, payload),
};

export const useCommunityFeed = (
  params?: {
    sort?: CommunityFeedSort;
    type?: CommunityPostType;
    tag?: string;
    authorId?: string;
    following?: boolean;
    limit?: number;
  },
  enabled = true,
) =>
  useInfiniteQuery({
    queryKey: communityQueryKey.feed(params),
    queryFn: ({ pageParam }) =>
      communityApi.listFeed({ ...params, cursor: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.meta.nextCursor ?? undefined,
    enabled,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });

export const useCommunitySearch = (
  params?: {
    q?: string;
    type?: CommunityPostType;
    tag?: string;
    authorId?: string;
    page?: number;
    limit?: number;
  },
  enabled = true,
) =>
  useQuery({
    queryKey: communityQueryKey.search(params),
    queryFn: () => communityApi.search(params),
    enabled,
  });

export const useCommunityTags = (enabled = true) =>
  useQuery({
    queryKey: communityQueryKey.tags(),
    queryFn: () => communityApi.listTags(),
    enabled,
    staleTime: 60_000,
  });

export const useCommunityPost = (id: string, enabled = true) =>
  useQuery({
    queryKey: communityQueryKey.detail(id),
    queryFn: () => communityApi.getById(id),
    enabled: enabled && Boolean(id),
  });

export const useCreateCommunityPost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCommunityPostPayload) => communityApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communityQueryKey.all });
    },
  });
};

export const useUpdateCommunityPost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCommunityPostPayload }) =>
      communityApi.update(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: communityQueryKey.all });
      queryClient.invalidateQueries({
        queryKey: communityQueryKey.detail(variables.id),
      });
    },
  });
};

export const useDeleteCommunityPost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => communityApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communityQueryKey.all });
    },
  });
};

export const useCommunityComments = (postId: string, enabled = true) =>
  useQuery({
    queryKey: communityQueryKey.comments(postId),
    queryFn: () => communityApi.listComments(postId),
    enabled: enabled && Boolean(postId),
  });

export const useCommunityEngagement = (postId: string, enabled = true) =>
  useQuery({
    queryKey: communityQueryKey.engagement(postId),
    queryFn: () => communityApi.getEngagement(postId),
    enabled: enabled && Boolean(postId),
  });

export const useToggleCommunityUpvote = (postId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => communityApi.toggleUpvote(postId),
    onSuccess: (data) => {
      queryClient.setQueryData(
        communityQueryKey.engagement(postId),
        (current: CommunityEngagementDto | undefined) =>
          current
            ? { ...current, isUpvoted: data.upvoted, upvoteCount: data.upvoteCount }
            : current,
      );
      queryClient.setQueryData(
        communityQueryKey.detail(postId),
        (current: CommunityPostDetailDto | undefined) =>
          current ? { ...current, upvoteCount: data.upvoteCount, isUpvoted: data.upvoted } : current,
      );
      queryClient.invalidateQueries({ queryKey: communityQueryKey.feed() });
    },
  });
};

export const useToggleCommunityFollow = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => communityApi.toggleFollow(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communityQueryKey.following() });
      queryClient.invalidateQueries({ queryKey: communityQueryKey.feed() });
    },
  });
};

export const useCommunityFollowingIds = (enabled = true) =>
  useQuery({
    queryKey: communityQueryKey.following(),
    queryFn: () => communityApi.getFollowingIds(),
    enabled,
    staleTime: 60_000,
  });

export const useCreateCommunityComment = (postId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCommunityCommentPayload) =>
      communityApi.createComment(postId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communityQueryKey.comments(postId) });
      queryClient.setQueryData(
        communityQueryKey.engagement(postId),
        (current: CommunityEngagementDto | undefined) =>
          current ? { ...current, commentCount: current.commentCount + 1 } : current,
      );
      queryClient.setQueryData(
        communityQueryKey.detail(postId),
        (current: CommunityPostDetailDto | undefined) =>
          current ? { ...current, commentCount: current.commentCount + 1 } : current,
      );
    },
  });
};

export const useDeleteCommunityComment = (postId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => communityApi.deleteComment(postId, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communityQueryKey.comments(postId) });
    },
  });
};

export const useToggleCommunityCommentUpvote = (postId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) =>
      communityApi.toggleCommentUpvote(postId, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communityQueryKey.comments(postId) });
    },
  });
};

export const useSubmitCommunityExercise = (postId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCommunitySubmissionPayload) =>
      communityApi.submitExercise(postId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: communityQueryKey.mySubmissions(postId),
      });
      queryClient.invalidateQueries({ queryKey: communityQueryKey.detail(postId) });
    },
  });
};

export const useMyCommunitySubmissions = (postId: string, enabled = true) =>
  useQuery({
    queryKey: communityQueryKey.mySubmissions(postId),
    queryFn: () => communityApi.listMySubmissions(postId),
    enabled: enabled && Boolean(postId),
  });


