import type {
  BlogListResultDto,
  BlogListSidebarDto,
  BlogPostDetailDto,
  BlogPostListItemDto,
  BlogTagListItemDto,
} from '@mezon-tutors/shared';
import { serverFetch } from '@/services/api-server';

const BASE = '/blog';

function buildListQuery(params?: { search?: string; page?: number; limit?: number }) {
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.set('search', params.search);
  searchParams.set('page', String(params?.page ?? 1));
  searchParams.set('limit', String(params?.limit ?? 5));
  return searchParams.toString();
}

const emptyMeta = {
  page: 1,
  limit: 5,
  total: 0,
  totalPages: 0,
  hasNext: false,
  hasPrev: false,
};

export async function fetchFeaturedBlog(): Promise<BlogPostListItemDto | null> {
  return serverFetch<BlogPostListItemDto | null>(`${BASE}/featured`);
}

export async function fetchBlogListSidebar(): Promise<BlogListSidebarDto> {
  const data = await serverFetch<BlogListSidebarDto>(`${BASE}/sidebar`);
  return (
    data ?? {
      popularPosts: [],
      tags: [],
      newTopics: [],
      trendingTags: [],
    }
  );
}

export async function fetchPublishedBlogs(params?: {
  search?: string;
  page?: number;
  limit?: number;
}): Promise<BlogListResultDto> {
  const qs = buildListQuery(params);
  const data = await serverFetch<BlogListResultDto>(`${BASE}?${qs}`);
  if (data?.data && Array.isArray(data.data)) {
    return data;
  }
  return { data: [], meta: emptyMeta };
}

export async function fetchPublishedBlogBySlug(
  slug: string,
  options?: { noStore?: boolean }
): Promise<BlogPostDetailDto | null> {
  return serverFetch<BlogPostDetailDto>(`${BASE}/${encodeURIComponent(slug)}`, options);
}

export async function fetchBlogTags(): Promise<BlogTagListItemDto[]> {
  const data = await serverFetch<BlogTagListItemDto[]>(`${BASE}/tags`);
  return data ?? [];
}

export async function fetchBlogTagBySlug(
  slug: string
): Promise<BlogTagListItemDto | null> {
  return serverFetch<BlogTagListItemDto>(`${BASE}/tags/${encodeURIComponent(slug)}`);
}

export async function fetchPublishedBlogsByTagSlug(
  slug: string
): Promise<BlogPostListItemDto[]> {
  const data = await serverFetch<BlogPostListItemDto[]>(
    `${BASE}/tags/${encodeURIComponent(slug)}/posts`
  );
  return data ?? [];
}
