import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BlogPublishStatus,
  BlogUpdateReviewStatus,
  Prisma,
} from '@mezon-tutors/db';
import type {
  BlogCommentDto,
  BlogEngagementDto,
  BlogMetricsDto,
  BlogPostDetailDto,
  BlogPostListItemDto,
  BlogPublishStatusFilter,
  BlogTagListItemDto,
  CreateBlogPayload,
  ToggleBlogUpvoteResultDto,
  ToggleCommentUpvoteResultDto,
} from '@mezon-tutors/shared';
import { BLOG_SLUG_PATTERN } from '@mezon-tutors/shared';
import { PrismaService } from '../../prisma/prisma.service';
import {
  blogInclude,
  toBlogPostDetailDto,
  toBlogPostListItemDto,
  type BlogPostWithRelations,
} from './blog.mapper';

function slugifyTagName(name: string): string {
  return name
    .normalize('NFD')
    // biome-ignore lint/suspicious/noMisleadingCharacterClass: remove combining diacritical marks
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function slugifyTitle(title: string): string {
  return title
    .normalize('NFD')
    // biome-ignore lint/suspicious/noMisleadingCharacterClass: remove combining diacritical marks
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function stripHtml(content: string): string {
  return content
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function estimateReadingTime(content: string): number {
  const words = stripHtml(content).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

@Injectable()
export class BlogService {
  constructor(private readonly prisma: PrismaService) {}

  private getStartOfToday(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  private getStartOfWeek(): Date {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const day = startOfToday.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    startOfToday.setDate(startOfToday.getDate() + diff);
    return startOfToday;
  }

  private async resolveUniqueSlug(
    preferred?: string,
    fallbackTitle?: string,
    excludeId?: string,
  ): Promise<string> {
    const base = (preferred?.trim() || slugifyTitle(fallbackTitle ?? 'blog-post'))
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (!base || !BLOG_SLUG_PATTERN.test(base)) {
      throw new BadRequestException('Invalid blog slug');
    }

    let candidate = base;
    let suffix = 1;
    while (true) {
      const existing = await this.prisma.blogPost.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });
      if (!existing || existing.id === excludeId) return candidate;
      suffix += 1;
      candidate = `${base}-${suffix}`;
    }
  }

  private async resolveTags(
    tagIds?: string[],
    tagNames?: string[],
  ): Promise<string[]> {
    const ids: string[] = [];

    for (const id of tagIds ?? []) {
      const existing = await this.prisma.blogTag.findUnique({ where: { id } });
      if (!existing) {
        throw new NotFoundException(`Tag not found: ${id}`);
      }
      ids.push(existing.id);
    }

    for (const name of tagNames ?? []) {
      if (!name.trim()) continue;
      const trimmed = name.trim();
      const existing = await this.prisma.blogTag.findFirst({
        where: { name: trimmed },
      });
      if (existing) {
        ids.push(existing.id);
        continue;
      }

      const slug = slugifyTagName(trimmed);
      if (!slug) {
        throw new BadRequestException(`Invalid tag name: ${trimmed}`);
      }

      const created = await this.prisma.blogTag.create({
        data: { name: trimmed, slug },
      });
      ids.push(created.id);
    }

    return [...new Set(ids)];
  }

  async listPublished(): Promise<BlogPostListItemDto[]> {
    const startOfToday = this.getStartOfToday();
    const startOfWeek = this.getStartOfWeek();

    const posts = await this.prisma.blogPost.findMany({
      where: { publishStatus: BlogPublishStatus.PUBLISHED },
      include: blogInclude,
      orderBy: { publishedAt: 'desc' },
    });

    const postIds = posts.map((post) => post.id);
    const [todayUpvotes, weeklyUpvotes, todayComments, todayCommentUpvotes] = await Promise.all([
      this.prisma.blogPostUpvote.groupBy({
        by: ['postId'],
        where: {
          postId: { in: postIds },
          createdAt: { gte: startOfToday },
        },
        _count: { _all: true },
      }),
      this.prisma.blogPostUpvote.groupBy({
        by: ['postId'],
        where: {
          postId: { in: postIds },
          createdAt: { gte: startOfWeek },
        },
        _count: { _all: true },
      }),
      this.prisma.blogPostComment.groupBy({
        by: ['postId'],
        where: {
          postId: { in: postIds },
          createdAt: { gte: startOfToday },
        },
        _count: { _all: true },
      }),
      this.prisma.blogPostCommentUpvote.findMany({
        where: {
          createdAt: { gte: startOfToday },
          comment: {
            postId: { in: postIds },
          },
        },
        select: {
          comment: {
            select: { postId: true },
          },
        },
      }),
    ]);

    const todayMap = new Map(todayUpvotes.map((entry) => [entry.postId, entry._count._all]));
    const weekMap = new Map(weeklyUpvotes.map((entry) => [entry.postId, entry._count._all]));
    const todayCommentMap = new Map(todayComments.map((entry) => [entry.postId, entry._count._all]));
    const todayCommentUpvoteMap = new Map<string, number>();
    for (const upvote of todayCommentUpvotes) {
      const postId = upvote.comment.postId;
      todayCommentUpvoteMap.set(postId, (todayCommentUpvoteMap.get(postId) ?? 0) + 1);
    }

    return posts.map((post) => {
      const dto = toBlogPostListItemDto(post);
      return {
        ...dto,
        upvoteCount: post._count?.upvotes ?? 0,
        upvotesToday: todayMap.get(post.id) ?? 0,
        upvotesThisWeek: weekMap.get(post.id) ?? 0,
        commentsToday: todayCommentMap.get(post.id) ?? 0,
        commentUpvotesToday: todayCommentUpvoteMap.get(post.id) ?? 0,
      };
    });
  }

  async listTags(): Promise<BlogTagListItemDto[]> {
    const tags = await this.prisma.blogTag.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { posts: true } } },
    });
    return tags.map((tag) => ({
      id: tag.id,
      slug: tag.slug,
      name: tag.name,
      postCount: tag._count.posts,
    }));
  }

  async getPublishedBySlug(slug: string): Promise<BlogPostDetailDto> {
    const post = await this.prisma.blogPost.findFirst({
      where: { slug, publishStatus: BlogPublishStatus.PUBLISHED },
      include: blogInclude,
    });
    if (!post) {
      throw new NotFoundException('Blog post not found');
    }
    return toBlogPostDetailDto(post);
  }

  async createPending(
    userId: string,
    payload: CreateBlogPayload,
  ): Promise<BlogPostDetailDto> {
    const slug = await this.resolveUniqueSlug(payload.slug, payload.title);
    const tagIds = await this.resolveTags(payload.tagIds, payload.tagNames);

    const post = await this.prisma.blogPost.create({
      data: {
        slug,
        publishStatus: BlogPublishStatus.PENDING,
        title: payload.title.trim(),
        content: payload.content,
        excerpt: payload.excerpt?.trim() || null,
        coverImageUrl: payload.coverImageUrl?.trim() || null,
        seoTitle: payload.seoTitle?.trim() || null,
        seoDescription: payload.seoDescription?.trim() || null,
        ogImageUrl: payload.ogImageUrl?.trim() || null,
        readingTime: estimateReadingTime(payload.content),
        tags: tagIds.length
          ? { connect: tagIds.map((id) => ({ id })) }
          : undefined,
        authorId: userId,
      },
      include: blogInclude,
    });

    return toBlogPostDetailDto(post as BlogPostWithRelations);
  }

  async listMySubmissions(userId: string): Promise<BlogPostListItemDto[]> {
    const posts = await this.prisma.blogPost.findMany({
      where: { authorId: userId },
      include: blogInclude,
      orderBy: { createdAt: 'desc' },
    });
    return posts.map((post) => toBlogPostListItemDto(post));
  }

  async getMySubmissionById(
    userId: string,
    id: string,
  ): Promise<BlogPostDetailDto> {
    const post = await this.prisma.blogPost.findFirst({
      where: { id, authorId: userId },
      include: blogInclude,
    });
    if (!post) {
      throw new NotFoundException('Blog post not found');
    }
    return toBlogPostDetailDto(post);
  }

  private async buildUpdateData(
    payload: CreateBlogPayload,
    excludeId?: string,
  ) {
    const tagIds = await this.resolveTags(payload.tagIds, payload.tagNames);
    const data: Record<string, unknown> = {
      title: payload.title.trim(),
      content: payload.content,
      excerpt: payload.excerpt?.trim() || null,
      coverImageUrl: payload.coverImageUrl?.trim() || null,
      seoTitle: payload.seoTitle?.trim() || null,
      seoDescription: payload.seoDescription?.trim() || null,
      ogImageUrl: payload.ogImageUrl?.trim() || null,
      readingTime: estimateReadingTime(payload.content),
      tags: { set: tagIds.map((id) => ({ id })) },
    };

    if (payload.slug) {
      data.slug = await this.resolveUniqueSlug(
        payload.slug,
        undefined,
        excludeId,
      );
    }

    return data;
  }

  async updateMySubmission(
    userId: string,
    id: string,
    payload: CreateBlogPayload,
  ): Promise<BlogPostDetailDto> {
    const existing = await this.prisma.blogPost.findFirst({
      where: { id, authorId: userId },
    });
    if (!existing) {
      throw new NotFoundException('Blog post not found');
    }
    if (existing.publishStatus === BlogPublishStatus.CLOSED) {
      throw new ForbiddenException('Closed blog posts cannot be edited');
    }

    if (existing.publishStatus === BlogPublishStatus.PUBLISHED) {
      const post = await this.prisma.blogPost.update({
        where: { id },
        data: {
          pendingUpdate: payload as Prisma.InputJsonValue,
          updateReviewStatus: BlogUpdateReviewStatus.PENDING,
          updateSubmittedAt: new Date(),
          updateRejectedReason: null,
        },
        include: blogInclude,
      });
      return toBlogPostDetailDto(post as BlogPostWithRelations);
    }

    const updateData = await this.buildUpdateData(payload, id);
    const post = await this.prisma.blogPost.update({
      where: { id },
      data: {
        ...updateData,
        publishStatus: BlogPublishStatus.PENDING,
        rejectedReason: null,
        publishedAt: null,
        reviewedBy: { disconnect: true },
        pendingUpdate: Prisma.JsonNull,
        updateReviewStatus: null,
        updateRejectedReason: null,
        updateSubmittedAt: null,
      },
      include: blogInclude,
    });

    return toBlogPostDetailDto(post as BlogPostWithRelations);
  }

  async listAdmin(
    status?: BlogPublishStatusFilter,
  ): Promise<BlogPostListItemDto[]> {
    const where =
      status === 'UPDATE_PENDING'
        ? { updateReviewStatus: BlogUpdateReviewStatus.PENDING }
        : status && status !== 'all'
          ? { publishStatus: status as BlogPublishStatus }
          : undefined;

    const posts = await this.prisma.blogPost.findMany({
      where,
      include: blogInclude,
      orderBy: [{ publishStatus: 'asc' }, { createdAt: 'desc' }],
    });
    return posts.map((post) => toBlogPostListItemDto(post));
  }

  async getAdminById(id: string): Promise<BlogPostDetailDto> {
    const post = await this.prisma.blogPost.findUnique({
      where: { id },
      include: blogInclude,
    });
    if (!post) {
      throw new NotFoundException('Blog post not found');
    }
    return toBlogPostDetailDto(post);
  }

  async getMetrics(): Promise<BlogMetricsDto> {
    const [pending, published, rejected, closed, pendingUpdates, total] =
      await Promise.all([
        this.prisma.blogPost.count({
          where: { publishStatus: BlogPublishStatus.PENDING },
        }),
        this.prisma.blogPost.count({
          where: { publishStatus: BlogPublishStatus.PUBLISHED },
        }),
        this.prisma.blogPost.count({
          where: { publishStatus: BlogPublishStatus.REJECTED },
        }),
        this.prisma.blogPost.count({
          where: { publishStatus: BlogPublishStatus.CLOSED },
        }),
        this.prisma.blogPost.count({
          where: { updateReviewStatus: BlogUpdateReviewStatus.PENDING },
        }),
        this.prisma.blogPost.count(),
      ]);

    return { pending, published, rejected, closed, pendingUpdates, total };
  }

  async publish(id: string, reviewerId: string): Promise<BlogPostDetailDto> {
    const existing = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Blog post not found');
    }
    if (existing.publishStatus === BlogPublishStatus.PUBLISHED) {
      throw new ConflictException('Blog post is already published');
    }

    const post = await this.prisma.blogPost.update({
      where: { id },
      data: {
        publishStatus: BlogPublishStatus.PUBLISHED,
        publishedAt: new Date(),
        reviewedById: reviewerId,
        rejectedReason: null,
      },
      include: blogInclude,
    });
    return toBlogPostDetailDto(post);
  }

  async reject(
    id: string,
    reviewerId: string,
    reason: string,
  ): Promise<BlogPostDetailDto> {
    const existing = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Blog post not found');
    }

    const post = await this.prisma.blogPost.update({
      where: { id },
      data: {
        publishStatus: BlogPublishStatus.REJECTED,
        rejectedReason: reason.trim(),
        reviewedById: reviewerId,
        publishedAt: null,
      },
      include: blogInclude,
    });
    return toBlogPostDetailDto(post);
  }

  async close(id: string, reviewerId: string): Promise<BlogPostDetailDto> {
    const existing = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Blog post not found');
    }
    if (existing.publishStatus !== BlogPublishStatus.PUBLISHED) {
      throw new BadRequestException('Only published blog posts can be closed');
    }

    const post = await this.prisma.blogPost.update({
      where: { id },
      data: {
        publishStatus: BlogPublishStatus.CLOSED,
        reviewedById: reviewerId,
        pendingUpdate: Prisma.JsonNull,
        updateReviewStatus: null,
        updateRejectedReason: null,
        updateSubmittedAt: null,
      },
      include: blogInclude,
    });
    return toBlogPostDetailDto(post);
  }

  async approveUpdate(
    id: string,
    reviewerId: string,
  ): Promise<BlogPostDetailDto> {
    const existing = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Blog post not found');
    }
    if (existing.updateReviewStatus !== BlogUpdateReviewStatus.PENDING) {
      throw new BadRequestException('No pending update to approve');
    }
    if (!existing.pendingUpdate) {
      throw new BadRequestException('Pending update payload is missing');
    }

    const payload = existing.pendingUpdate as CreateBlogPayload;
    const updateData = await this.buildUpdateData(payload, id);

    const post = await this.prisma.blogPost.update({
      where: { id },
      data: {
        ...updateData,
        publishStatus: BlogPublishStatus.PUBLISHED,
        publishedAt: existing.publishedAt ?? new Date(),
        reviewedBy: { connect: { id: reviewerId } },
        rejectedReason: null,
        pendingUpdate: Prisma.JsonNull,
        updateReviewStatus: null,
        updateRejectedReason: null,
        updateSubmittedAt: null,
      },
      include: blogInclude,
    });

    return toBlogPostDetailDto(post as BlogPostWithRelations);
  }

  async rejectUpdate(
    id: string,
    reviewerId: string,
    reason: string,
  ): Promise<BlogPostDetailDto> {
    const existing = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Blog post not found');
    }
    if (existing.updateReviewStatus !== BlogUpdateReviewStatus.PENDING) {
      throw new BadRequestException('No pending update to reject');
    }

    const post = await this.prisma.blogPost.update({
      where: { id },
      data: {
        pendingUpdate: Prisma.JsonNull,
        updateReviewStatus: BlogUpdateReviewStatus.REJECTED,
        updateRejectedReason: reason.trim(),
        reviewedById: reviewerId,
      },
      include: blogInclude,
    });
    return toBlogPostDetailDto(post);
  }

  private async getPublishedPostIdBySlug(slug: string): Promise<string> {
    const post = await this.prisma.blogPost.findFirst({
      where: { slug, publishStatus: BlogPublishStatus.PUBLISHED },
      select: { id: true },
    });
    if (!post) {
      throw new NotFoundException('Blog post not found');
    }
    return post.id;
  }

  async listComments(
    slug: string,
    userId?: string,
  ): Promise<BlogCommentDto[]> {
    const postId = await this.getPublishedPostIdBySlug(slug);
    const comments = await this.prisma.blogPostComment.findMany({
      where: { postId },
      include: {
        user: { select: { id: true, username: true, avatar: true } },
        _count: { select: { upvotes: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const commentIds = comments.map((c) => c.id);
    let userUpvotes = new Set<string>();
    if (userId) {
      const upvotes = await this.prisma.blogPostCommentUpvote.findMany({
        where: { commentId: { in: commentIds }, userId },
        select: { commentId: true },
      });
      userUpvotes = new Set(upvotes.map((u) => u.commentId));
    }

    const commentMap = new Map<string, BlogCommentDto>();
    const rootComments: BlogCommentDto[] = [];

    for (const comment of comments) {
      const dto: BlogCommentDto = {
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt.toISOString(),
        author: {
          id: comment.user.id,
          username: comment.user.username,
          avatar: comment.user.avatar,
        },
        isMine: userId === comment.user.id,
        parentId: comment.parentId,
        upvoteCount: comment._count.upvotes,
        isUpvoted: userUpvotes.has(comment.id),
        replies: [],
      };
      commentMap.set(comment.id, dto);
    }

    for (const comment of comments) {
      const dto = commentMap.get(comment.id)!;
      if (comment.parentId && commentMap.has(comment.parentId)) {
        commentMap.get(comment.parentId)!.replies.push(dto);
      } else {
        rootComments.push(dto);
      }
    }

    return rootComments;
  }

  async createComment(
    userId: string,
    slug: string,
    content: string,
    parentId?: string,
  ): Promise<BlogCommentDto> {
    const postId = await this.getPublishedPostIdBySlug(slug);
    const trimmed = content.trim();
    if (!trimmed) {
      throw new BadRequestException('Comment content is required');
    }

    if (parentId) {
      const parent = await this.prisma.blogPostComment.findFirst({
        where: { id: parentId, postId },
      });
      if (!parent) {
        throw new NotFoundException('Parent comment not found');
      }
    }

    const comment = await this.prisma.blogPostComment.create({
      data: {
        postId,
        userId,
        content: trimmed,
        parentId: parentId ?? null,
      },
      include: {
        user: { select: { id: true, username: true, avatar: true } },
        _count: { select: { upvotes: true } },
      },
    });

    return {
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      author: {
        id: comment.user.id,
        username: comment.user.username,
        avatar: comment.user.avatar,
      },
      isMine: true,
      parentId: comment.parentId,
      upvoteCount: comment._count.upvotes,
      isUpvoted: false,
      replies: [],
    };
  }

  async deleteComment(
    userId: string,
    slug: string,
    commentId: string,
  ): Promise<void> {
    const postId = await this.getPublishedPostIdBySlug(slug);
    const comment = await this.prisma.blogPostComment.findFirst({
      where: { id: commentId, postId },
    });
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }
    await this.prisma.blogPostComment.delete({ where: { id: commentId } });
  }

  async toggleUpvote(
    userId: string,
    slug: string,
  ): Promise<ToggleBlogUpvoteResultDto> {
    const postId = await this.getPublishedPostIdBySlug(slug);
    const existing = await this.prisma.blogPostUpvote.findUnique({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
    });

    if (existing) {
      await this.prisma.blogPostUpvote.delete({ where: { id: existing.id } });
      const upvoteCount = await this.prisma.blogPostUpvote.count({
        where: { postId },
      });
      return { upvoted: false, upvoteCount };
    }

    await this.prisma.blogPostUpvote.create({
      data: { postId, userId },
    });
    const upvoteCount = await this.prisma.blogPostUpvote.count({
      where: { postId },
    });
    return { upvoted: true, upvoteCount };
  }

  async toggleCommentUpvote(
    userId: string,
    slug: string,
    commentId: string,
  ): Promise<ToggleCommentUpvoteResultDto> {
    const postId = await this.getPublishedPostIdBySlug(slug);
    const comment = await this.prisma.blogPostComment.findFirst({
      where: { id: commentId, postId },
    });
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    const existing = await this.prisma.blogPostCommentUpvote.findUnique({
      where: {
        commentId_userId: {
          commentId,
          userId,
        },
      },
    });

    if (existing) {
      await this.prisma.blogPostCommentUpvote.delete({
        where: { id: existing.id },
      });
      const upvoteCount = await this.prisma.blogPostCommentUpvote.count({
        where: { commentId },
      });
      return { upvoted: false, upvoteCount };
    }

    await this.prisma.blogPostCommentUpvote.create({
      data: { commentId, userId },
    });
    const upvoteCount = await this.prisma.blogPostCommentUpvote.count({
      where: { commentId },
    });
    return { upvoted: true, upvoteCount };
  }

  async getEngagement(
    userId: string,
    slug: string,
  ): Promise<BlogEngagementDto> {
    const postId = await this.getPublishedPostIdBySlug(slug);
    const [upvoteCount, commentCount, upvote] = await Promise.all([
      this.prisma.blogPostUpvote.count({ where: { postId } }),
      this.prisma.blogPostComment.count({ where: { postId } }),
      this.prisma.blogPostUpvote.findUnique({
        where: {
          postId_userId: {
            postId,
            userId,
          },
        },
      }),
    ]);

    return {
      upvoteCount,
      commentCount,
      isUpvoted: Boolean(upvote),
    };
  }
}
