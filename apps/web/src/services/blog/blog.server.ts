import type { BlogPostDetailDto, BlogPostListItemDto } from '@mezon-tutors/shared';
import { serverFetch } from '@/services/api-server';

const BASE = '/blog';

export async function fetchPublishedBlogs(): Promise<BlogPostListItemDto[]> {
  const data = await serverFetch<BlogPostListItemDto[]>(BASE);
  return data ?? [];
}

export async function fetchPublishedBlogBySlug(
  slug: string,
  options?: { noStore?: boolean }
): Promise<BlogPostDetailDto | null> {
  return serverFetch<BlogPostDetailDto>(`${BASE}/${encodeURIComponent(slug)}`, options);
}
