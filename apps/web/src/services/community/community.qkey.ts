import type { CommunityFeedSort, CommunityPostType } from '@mezon-tutors/shared';

export const communityQueryKey = {
  all: ['community'] as const,
  feed: (params?: {
    sort?: CommunityFeedSort;
    type?: CommunityPostType;
    tag?: string;
    authorId?: string;
  }) => [...communityQueryKey.all, 'feed', params ?? {}] as const,
  search: (params?: Record<string, unknown>) =>
    [...communityQueryKey.all, 'search', params ?? {}] as const,
  detail: (id: string) => [...communityQueryKey.all, 'detail', id] as const,
  tags: () => [...communityQueryKey.all, 'tags'] as const,
  comments: (postId: string) => [...communityQueryKey.all, 'comments', postId] as const,
  engagement: (postId: string) => [...communityQueryKey.all, 'engagement', postId] as const,
  bookmarks: () => [...communityQueryKey.all, 'bookmarks'] as const,
  mySubmissions: (postId: string) =>
    [...communityQueryKey.all, 'submissions', postId] as const,
};
