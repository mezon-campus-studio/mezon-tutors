import type {
  CommunityFeedResultDto,
  CommunityPostDetailDto,
  CommunityTagListItemDto,
} from '@mezon-tutors/shared';
import type { CommunityFeedSort, CommunityPostType } from '@mezon-tutors/shared';
import { serverFetch } from '@/services/api-server';

const BASE = '/community';

export async function fetchCommunityFeed(params?: {
  sort?: CommunityFeedSort;
  type?: CommunityPostType;
  tag?: string;
  limit?: number;
}): Promise<CommunityFeedResultDto> {
  const searchParams = new URLSearchParams();
  if (params?.sort) searchParams.set('sort', params.sort);
  if (params?.type) searchParams.set('type', params.type);
  if (params?.tag) searchParams.set('tag', params.tag);
  searchParams.set('limit', String(params?.limit ?? 10));
  const qs = searchParams.toString();
  const data = await serverFetch<CommunityFeedResultDto>(`${BASE}/feed?${qs}`);
  return data ?? { data: [], meta: { nextCursor: null, hasMore: false } };
}

export async function fetchCommunityPostById(
  id: string,
): Promise<CommunityPostDetailDto | null> {
  return serverFetch<CommunityPostDetailDto>(`${BASE}/posts/${id}`);
}

export async function fetchCommunityTags(): Promise<CommunityTagListItemDto[]> {
  const data = await serverFetch<CommunityTagListItemDto[]>(`${BASE}/tags`);
  return data ?? [];
}

export async function fetchCommunityTagBySlug(
  slug: string,
): Promise<CommunityTagListItemDto | null> {
  const tags = await fetchCommunityTags();
  return tags.find((tag) => tag.slug === slug) ?? null;
}
