import type { BlogPost, BlogTag, Prisma, User } from '@mezon-tutors/db';
import type {
  BlogPostDetailDto,
  BlogPostListItemDto,
  CreateBlogPayload,
} from '@mezon-tutors/shared';

export type BlogPostWithRelations = BlogPost & {
  tags: BlogTag[];
  author: Pick<User, 'id' | 'username' | 'avatar' | 'email'> | null;
  reviewedBy: Pick<User, 'id' | 'username'> | null;
  _count?: {
    upvotes: number;
    comments: number;
  };
};

export function toBlogPostListItemDto(
  post: BlogPostWithRelations,
): BlogPostListItemDto {
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    coverImageUrl: post.coverImageUrl,
    readingTime: post.readingTime,
    publishStatus: post.publishStatus,
    createdAt: post.createdAt.toISOString(),
    publishedAt: post.publishedAt?.toISOString() ?? null,
    rejectedReason: post.rejectedReason,
    updateReviewStatus: post.updateReviewStatus,
    updateSubmittedAt: post.updateSubmittedAt?.toISOString() ?? null,
    tags: post.tags.map((tag) => ({
      id: tag.id,
      slug: tag.slug,
      name: tag.name,
    })),
    author: post.author
      ? {
          id: post.author.id,
          username: post.author.username,
          avatar: post.author.avatar,
        }
      : null,
  };
}

export function toBlogPostDetailDto(
  post: BlogPostWithRelations,
): BlogPostDetailDto {
  const base = toBlogPostListItemDto(post);
  return {
    ...base,
    content: post.content,
    seoTitle: post.seoTitle,
    seoDescription: post.seoDescription,
    ogImageUrl: post.ogImageUrl,
    upvoteCount: post._count?.upvotes ?? 0,
    commentCount: post._count?.comments ?? 0,
    createdBy: post.author
      ? {
          id: post.author.id,
          username: post.author.username,
          email: post.author.email,
        }
      : null,
    reviewedBy: post.reviewedBy
      ? {
          id: post.reviewedBy.id,
          username: post.reviewedBy.username,
        }
      : null,
    pendingUpdate: post.pendingUpdate
      ? (post.pendingUpdate as CreateBlogPayload)
      : null,
    updateRejectedReason: post.updateRejectedReason,
  };
}

export const blogInclude = {
  tags: true,
  author: { select: { id: true, username: true, avatar: true, email: true } },
  reviewedBy: { select: { id: true, username: true } },
  _count: {
    select: {
      upvotes: true,
      comments: true,
    },
  },
} satisfies Prisma.BlogPostInclude;
