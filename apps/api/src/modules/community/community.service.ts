import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CommunityPostType,
  Prisma,
} from '@mezon-tutors/db';
import type {
  CommunityCommentDto,
  CommunityEngagementDto,
  CommunityExerciseSubmissionDto,
  CommunityFeedResultDto,
  CommunityFeedSort,
  CommunityPostDetailDto,
  CommunityPostListItemDto,
  CommunitySearchResultDto,
  CommunityTagListItemDto,
  CreateCommunityPostPayload,
  ToggleCommunityBookmarkResultDto,
  ToggleCommunityUpvoteResultDto,
  UpdateCommunityPostPayload,
} from '@mezon-tutors/shared';
import {
  COMMUNITY_MAX_COMMENT_DEPTH,
} from '@mezon-tutors/shared';
import { PrismaService } from '../../prisma/prisma.service';
import {
  communityPostInclude,
  toCommunityCommentDto,
  toCommunityPostDetailDto,
  toCommunityPostListItemDto,
  toCommunitySubmissionDto,
  type CommunityPostWithRelations,
} from './community.mapper';
import type { CreateCommunityExerciseDto } from './dto/community.dto';

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

function computeHotScore(
  upvoteCount: number,
  commentCount: number,
  publishedAt: Date,
): number {
  const engagement =
    Math.log10(Math.max(upvoteCount, 1)) +
    0.3 * Math.log10(Math.max(commentCount, 1));
  return engagement + publishedAt.getTime() / 45_000_000_000;
}

type FeedCursor = {
  publishedAt: string;
  id: string;
  hotScore?: number;
  upvoteCount?: number;
};

@Injectable()
export class CommunityService {
  constructor(private readonly prisma: PrismaService) {}

  private activePostWhere: Prisma.CommunityPostWhereInput = {
    deletedAt: null,
  };

  private encodeCursor(cursor: FeedCursor): string {
    return Buffer.from(JSON.stringify(cursor)).toString('base64url');
  }

  private decodeCursor(cursor: string): FeedCursor {
    try {
      return JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as FeedCursor;
    } catch {
      throw new BadRequestException('Invalid cursor');
    }
  }

  private async resolveTags(
    tagIds?: string[],
    tagNames?: string[],
  ): Promise<string[]> {
    const ids: string[] = [];

    for (const id of tagIds ?? []) {
      const existing = await this.prisma.communityTag.findUnique({ where: { id } });
      if (!existing) {
        throw new NotFoundException(`Tag not found: ${id}`);
      }
      ids.push(existing.id);
    }

    for (const name of tagNames ?? []) {
      if (!name.trim()) continue;
      const trimmed = name.trim();
      const existing = await this.prisma.communityTag.findFirst({
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

      const created = await this.prisma.communityTag.create({
        data: { name: trimmed, slug },
      });
      ids.push(created.id);
    }

    return [...new Set(ids)];
  }

  private validateExercisePayload(
    type: CommunityPostType,
    exercise?: CreateCommunityExerciseDto,
  ): void {
    if (type === CommunityPostType.EXERCISE && !exercise) {
      throw new BadRequestException('Exercise data is required for EXERCISE posts');
    }
    if (type !== CommunityPostType.EXERCISE && exercise) {
      throw new BadRequestException('Exercise data is only allowed for EXERCISE posts');
    }
  }

  private async getActivePostOrThrow(postId: string): Promise<CommunityPostWithRelations> {
    const post = await this.prisma.communityPost.findFirst({
      where: { id: postId, ...this.activePostWhere },
      include: communityPostInclude,
    });
    if (!post) {
      throw new NotFoundException('Community post not found');
    }
    return post as CommunityPostWithRelations;
  }

  private async mapPostsWithUserState(
    posts: CommunityPostWithRelations[],
    userId?: string,
  ): Promise<CommunityPostListItemDto[]> {
    if (!userId || posts.length === 0) {
      return posts.map((post) => toCommunityPostListItemDto(post));
    }

    const postIds = posts.map((p) => p.id);
    const [upvotes, bookmarks] = await Promise.all([
      this.prisma.communityPostUpvote.findMany({
        where: { postId: { in: postIds }, userId },
        select: { postId: true },
      }),
      this.prisma.communityBookmark.findMany({
        where: { postId: { in: postIds }, userId },
        select: { postId: true },
      }),
    ]);

    const upvotedSet = new Set(upvotes.map((u) => u.postId));
    const bookmarkedSet = new Set(bookmarks.map((b) => b.postId));

    return posts.map((post) =>
      toCommunityPostListItemDto(post, {
        isUpvoted: upvotedSet.has(post.id),
        isBookmarked: bookmarkedSet.has(post.id),
        isMine: post.authorId === userId,
      }),
    );
  }

  async listFeed(params: {
    sort?: CommunityFeedSort;
    type?: CommunityPostType;
    tag?: string;
    authorId?: string;
    cursor?: string;
    limit?: number;
    userId?: string;
  }): Promise<CommunityFeedResultDto> {
    const limit = Math.min(50, Math.max(1, params.limit ?? 20));
    const sort = params.sort ?? 'latest';

    const where: Prisma.CommunityPostWhereInput = {
      ...this.activePostWhere,
      ...(params.type && { type: params.type }),
      ...(params.authorId && { authorId: params.authorId }),
      ...(params.tag && {
        tags: { some: { slug: params.tag } },
      }),
    };

    let orderBy: Prisma.CommunityPostOrderByWithRelationInput[];
    let cursorFilter: Prisma.CommunityPostWhereInput | undefined;

    if (params.cursor) {
      const decoded = this.decodeCursor(params.cursor);
      if (sort === 'trending' && decoded.hotScore !== undefined) {
        cursorFilter = {
          OR: [
            { hotScore: { lt: decoded.hotScore } },
            {
              hotScore: decoded.hotScore,
              id: { lt: decoded.id },
            },
          ],
        };
      } else if (sort === 'most_upvoted' && decoded.upvoteCount !== undefined) {
        cursorFilter = {
          OR: [
            { upvoteCount: { lt: decoded.upvoteCount } },
            {
              upvoteCount: decoded.upvoteCount,
              id: { lt: decoded.id },
            },
          ],
        };
      } else {
        const publishedAt = new Date(decoded.publishedAt);
        cursorFilter = {
          OR: [
            { publishedAt: { lt: publishedAt } },
            {
              publishedAt,
              id: { lt: decoded.id },
            },
          ],
        };
      }
    }

    if (sort === 'trending') {
      orderBy = [{ hotScore: 'desc' }, { id: 'desc' }];
    } else if (sort === 'most_upvoted') {
      orderBy = [{ upvoteCount: 'desc' }, { publishedAt: 'desc' }, { id: 'desc' }];
    } else {
      orderBy = [{ publishedAt: 'desc' }, { id: 'desc' }];
    }

    const posts = await this.prisma.communityPost.findMany({
      where: cursorFilter ? { AND: [where, cursorFilter] } : where,
      orderBy,
      take: limit + 1,
      include: communityPostInclude,
    });

    const hasMore = posts.length > limit;
    const page = hasMore ? posts.slice(0, limit) : posts;
    const last = page[page.length - 1];

    let nextCursor: string | null = null;
    if (hasMore && last) {
      if (sort === 'trending') {
        nextCursor = this.encodeCursor({
          publishedAt: last.publishedAt.toISOString(),
          id: last.id,
          hotScore: last.hotScore,
        });
      } else if (sort === 'most_upvoted') {
        nextCursor = this.encodeCursor({
          publishedAt: last.publishedAt.toISOString(),
          id: last.id,
          upvoteCount: last.upvoteCount,
        });
      } else {
        nextCursor = this.encodeCursor({
          publishedAt: last.publishedAt.toISOString(),
          id: last.id,
        });
      }
    }

    const data = await this.mapPostsWithUserState(
      page as CommunityPostWithRelations[],
      params.userId,
    );

    return { data, meta: { nextCursor, hasMore } };
  }

  async search(params: {
    q?: string;
    type?: CommunityPostType;
    tag?: string;
    authorId?: string;
    page?: number;
    limit?: number;
    userId?: string;
  }): Promise<CommunitySearchResultDto> {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(50, Math.max(1, params.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.CommunityPostWhereInput = {
      ...this.activePostWhere,
      ...(params.type && { type: params.type }),
      ...(params.authorId && { authorId: params.authorId }),
      ...(params.tag && { tags: { some: { slug: params.tag } } }),
      ...(params.q?.trim() && {
        content: { contains: params.q.trim(), mode: 'insensitive' },
      }),
    };

    const [total, posts] = await Promise.all([
      this.prisma.communityPost.count({ where }),
      this.prisma.communityPost.findMany({
        where,
        orderBy: [{ upvoteCount: 'desc' }, { publishedAt: 'desc' }],
        skip,
        take: limit,
        include: communityPostInclude,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);
    const data = await this.mapPostsWithUserState(
      posts as CommunityPostWithRelations[],
      params.userId,
    );

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async getById(id: string, userId?: string): Promise<CommunityPostDetailDto> {
    const post = await this.getActivePostOrThrow(id);
    const [upvote, bookmark] = userId
      ? await Promise.all([
          this.prisma.communityPostUpvote.findUnique({
            where: { postId_userId: { postId: id, userId } },
          }),
          this.prisma.communityBookmark.findUnique({
            where: { postId_userId: { postId: id, userId } },
          }),
        ])
      : [null, null];

    return toCommunityPostDetailDto(post, {
      isUpvoted: Boolean(upvote),
      isBookmarked: Boolean(bookmark),
      isMine: userId === post.authorId,
    });
  }

  async create(
    userId: string,
    payload: CreateCommunityPostPayload,
  ): Promise<CommunityPostDetailDto> {
    this.validateExercisePayload(payload.type as CommunityPostType, payload.exercise as CreateCommunityExerciseDto | undefined);

    const tagIds = await this.resolveTags(payload.tagIds, payload.tagNames);
    const now = new Date();
    const hotScore = computeHotScore(0, 0, now);

    const post = await this.prisma.$transaction(async (tx) => {
      const created = await tx.communityPost.create({
        data: {
          type: payload.type as CommunityPostType,
          authorId: userId,
          content: payload.content.trim(),
          publishedAt: now,
          hotScore,
          tags: tagIds.length > 0 ? { connect: tagIds.map((id) => ({ id })) } : undefined,
          media: payload.media?.length
            ? {
                create: payload.media.map((item, index) => ({
                  type: item.type,
                  url: item.url,
                  sortOrder: item.sortOrder ?? index,
                  metadata: (item.metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue,
                })),
              }
            : undefined,
          ...(payload.type === 'EXERCISE' && payload.exercise
            ? {
                exercise: {
                  create: {
                    exerciseType: payload.exercise.exerciseType,
                    difficulty: payload.exercise.difficulty ?? 'INTERMEDIATE',
                    explanation: payload.exercise.explanation?.trim() ?? null,
                    payload: payload.exercise.payload as Prisma.InputJsonValue,
                    correctAnswer: (payload.exercise.correctAnswer ?? Prisma.JsonNull) as Prisma.InputJsonValue,
                  },
                },
              }
            : {}),
        },
        include: communityPostInclude,
      });

      if (tagIds.length > 0) {
        await tx.communityTag.updateMany({
          where: { id: { in: tagIds } },
          data: { postCount: { increment: 1 } },
        });
      }

      return created;
    });

    return toCommunityPostDetailDto(post as CommunityPostWithRelations, {
      isMine: true,
      isUpvoted: false,
      isBookmarked: false,
    });
  }

  async update(
    userId: string,
    postId: string,
    payload: UpdateCommunityPostPayload,
  ): Promise<CommunityPostDetailDto> {
    const existing = await this.getActivePostOrThrow(postId);
    if (existing.authorId !== userId) {
      throw new ForbiddenException('You can only edit your own posts');
    }

    const tagIds =
      payload.tagIds !== undefined || payload.tagNames !== undefined
        ? await this.resolveTags(payload.tagIds, payload.tagNames)
        : undefined;

    const post = await this.prisma.$transaction(async (tx) => {
      if (tagIds !== undefined) {
        const oldTagIds = existing.tags.map((t) => t.id);
        const removed = oldTagIds.filter((id) => !tagIds.includes(id));
        const added = tagIds.filter((id) => !oldTagIds.includes(id));

        if (removed.length > 0) {
          await tx.communityTag.updateMany({
            where: { id: { in: removed } },
            data: { postCount: { decrement: 1 } },
          });
        }
        if (added.length > 0) {
          await tx.communityTag.updateMany({
            where: { id: { in: added } },
            data: { postCount: { increment: 1 } },
          });
        }
      }

      if (payload.media !== undefined) {
        await tx.communityPostMedia.deleteMany({ where: { postId } });
      }

      return tx.communityPost.update({
        where: { id: postId },
        data: {
          ...(payload.content !== undefined && { content: payload.content.trim() }),
          ...(tagIds !== undefined && {
            tags: { set: tagIds.map((id) => ({ id })) },
          }),
          ...(payload.media !== undefined && {
            media: {
              create: payload.media.map((item, index) => ({
                type: item.type,
                url: item.url,
                sortOrder: item.sortOrder ?? index,
                metadata: (item.metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue,
              })),
            },
          }),
          lastActivityAt: new Date(),
        },
        include: communityPostInclude,
      });
    });

    return toCommunityPostDetailDto(post as CommunityPostWithRelations, {
      isMine: true,
    });
  }

  async remove(userId: string, postId: string): Promise<void> {
    const post = await this.getActivePostOrThrow(postId);
    if (post.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    await this.prisma.communityPost.update({
      where: { id: postId },
      data: { deletedAt: new Date() },
    });
  }

  async listMine(userId: string): Promise<CommunityPostListItemDto[]> {
    const posts = await this.prisma.communityPost.findMany({
      where: { authorId: userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: communityPostInclude,
    });

    return posts.map((post) =>
      toCommunityPostListItemDto(post as CommunityPostWithRelations, { isMine: true }),
    );
  }

  async listTags(): Promise<CommunityTagListItemDto[]> {
    const tags = await this.prisma.communityTag.findMany({
      orderBy: { postCount: 'desc' },
    });
    return tags.map((tag) => ({
      id: tag.id,
      slug: tag.slug,
      name: tag.name,
      postCount: tag.postCount,
    }));
  }

  async listComments(postId: string, userId?: string): Promise<CommunityCommentDto[]> {
    await this.getActivePostOrThrow(postId);

    const comments = await this.prisma.communityComment.findMany({
      where: { postId },
      include: {
        author: { select: { id: true, username: true, avatar: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const commentIds = comments.map((c) => c.id);
    const userUpvotes = userId
      ? new Set(
          (
            await this.prisma.communityCommentUpvote.findMany({
              where: { commentId: { in: commentIds }, userId },
              select: { commentId: true },
            })
          ).map((u) => u.commentId),
        )
      : new Set<string>();

    const commentMap = new Map<string, CommunityCommentDto>();
    const rootComments: CommunityCommentDto[] = [];

    for (const comment of comments) {
      const dto = toCommunityCommentDto(comment, {
        userId,
        isUpvoted: userUpvotes.has(comment.id),
      });
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
    postId: string,
    content: string,
    parentId?: string,
  ): Promise<CommunityCommentDto> {
    await this.getActivePostOrThrow(postId);
    const trimmed = content.trim();
    if (!trimmed) {
      throw new BadRequestException('Comment content is required');
    }

    let rootId: string | null = null;
    let depth = 0;

    if (parentId) {
      const parent = await this.prisma.communityComment.findFirst({
        where: { id: parentId, postId, deletedAt: null },
      });
      if (!parent) {
        throw new NotFoundException('Parent comment not found');
      }
      if (parent.depth >= COMMUNITY_MAX_COMMENT_DEPTH - 1) {
        throw new BadRequestException(
          `Maximum reply depth of ${COMMUNITY_MAX_COMMENT_DEPTH} exceeded`,
        );
      }
      depth = parent.depth + 1;
      rootId = parent.rootId ?? parent.id;
    }

    const comment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.communityComment.create({
        data: {
          postId,
          authorId: userId,
          content: trimmed,
          parentId: parentId ?? null,
          rootId,
          depth,
        },
        include: {
          author: { select: { id: true, username: true, avatar: true } },
        },
      });

      await tx.communityPost.update({
        where: { id: postId },
        data: {
          commentCount: { increment: 1 },
          lastActivityAt: new Date(),
        },
      });

      if (parentId) {
        await tx.communityComment.update({
          where: { id: parentId },
          data: { replyCount: { increment: 1 } },
        });
      }

      const post = await tx.communityPost.findUnique({
        where: { id: postId },
        select: { upvoteCount: true, commentCount: true, publishedAt: true },
      });
      if (post) {
        await tx.communityPost.update({
          where: { id: postId },
          data: {
            hotScore: computeHotScore(
              post.upvoteCount,
              post.commentCount,
              post.publishedAt,
            ),
          },
        });
      }

      return created;
    });

    return toCommunityCommentDto(comment, {
      userId,
      isUpvoted: false,
    });
  }

  async deleteComment(
    userId: string,
    postId: string,
    commentId: string,
  ): Promise<void> {
    await this.getActivePostOrThrow(postId);
    const comment = await this.prisma.communityComment.findFirst({
      where: { id: commentId, postId },
    });
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    if (comment.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }
    if (comment.deletedAt) {
      return;
    }

    await this.prisma.communityComment.update({
      where: { id: commentId },
      data: { deletedAt: new Date() },
    });
  }

  async togglePostUpvote(
    userId: string,
    postId: string,
  ): Promise<ToggleCommunityUpvoteResultDto> {
    await this.getActivePostOrThrow(postId);

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.communityPostUpvote.findUnique({
        where: { postId_userId: { postId, userId } },
      });

      if (existing) {
        await tx.communityPostUpvote.delete({ where: { id: existing.id } });
        const post = await tx.communityPost.update({
          where: { id: postId },
          data: { upvoteCount: { decrement: 1 } },
          select: { upvoteCount: true, commentCount: true, publishedAt: true },
        });
        await tx.communityPost.update({
          where: { id: postId },
          data: {
            hotScore: computeHotScore(
              post.upvoteCount,
              post.commentCount,
              post.publishedAt,
            ),
          },
        });
        return { upvoted: false, upvoteCount: post.upvoteCount };
      }

      await tx.communityPostUpvote.create({ data: { postId, userId } });
      const post = await tx.communityPost.update({
        where: { id: postId },
        data: {
          upvoteCount: { increment: 1 },
          lastActivityAt: new Date(),
        },
        select: { upvoteCount: true, commentCount: true, publishedAt: true },
      });
      await tx.communityPost.update({
        where: { id: postId },
        data: {
          hotScore: computeHotScore(
            post.upvoteCount,
            post.commentCount,
            post.publishedAt,
          ),
        },
      });
      return { upvoted: true, upvoteCount: post.upvoteCount };
    });
  }

  async toggleCommentUpvote(
    userId: string,
    postId: string,
    commentId: string,
  ): Promise<ToggleCommunityUpvoteResultDto> {
    await this.getActivePostOrThrow(postId);
    const comment = await this.prisma.communityComment.findFirst({
      where: { id: commentId, postId, deletedAt: null },
    });
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.communityCommentUpvote.findUnique({
        where: { commentId_userId: { commentId, userId } },
      });

      if (existing) {
        await tx.communityCommentUpvote.delete({ where: { id: existing.id } });
        const updated = await tx.communityComment.update({
          where: { id: commentId },
          data: { upvoteCount: { decrement: 1 } },
          select: { upvoteCount: true },
        });
        return { upvoted: false, upvoteCount: updated.upvoteCount };
      }

      await tx.communityCommentUpvote.create({ data: { commentId, userId } });
      const updated = await tx.communityComment.update({
        where: { id: commentId },
        data: { upvoteCount: { increment: 1 } },
        select: { upvoteCount: true },
      });
      return { upvoted: true, upvoteCount: updated.upvoteCount };
    });
  }

  async toggleBookmark(
    userId: string,
    postId: string,
  ): Promise<ToggleCommunityBookmarkResultDto> {
    await this.getActivePostOrThrow(postId);

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.communityBookmark.findUnique({
        where: { postId_userId: { postId, userId } },
      });

      if (existing) {
        await tx.communityBookmark.delete({ where: { id: existing.id } });
        const post = await tx.communityPost.update({
          where: { id: postId },
          data: { bookmarkCount: { decrement: 1 } },
          select: { bookmarkCount: true },
        });
        return { bookmarked: false, bookmarkCount: post.bookmarkCount };
      }

      await tx.communityBookmark.create({ data: { postId, userId } });
      const post = await tx.communityPost.update({
        where: { id: postId },
        data: { bookmarkCount: { increment: 1 } },
        select: { bookmarkCount: true },
      });
      return { bookmarked: true, bookmarkCount: post.bookmarkCount };
    });
  }

  async listBookmarks(userId: string): Promise<CommunityPostListItemDto[]> {
    const bookmarks = await this.prisma.communityBookmark.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        post: { include: communityPostInclude },
      },
    });

    return bookmarks
      .filter((b) => b.post.deletedAt === null)
      .map((b) =>
        toCommunityPostListItemDto(b.post as CommunityPostWithRelations, {
          isBookmarked: true,
          isMine: b.post.authorId === userId,
        }),
      );
  }

  async getEngagement(
    userId: string,
    postId: string,
  ): Promise<CommunityEngagementDto> {
    const post = await this.getActivePostOrThrow(postId);
    const [upvote, bookmark] = await Promise.all([
      this.prisma.communityPostUpvote.findUnique({
        where: { postId_userId: { postId, userId } },
      }),
      this.prisma.communityBookmark.findUnique({
        where: { postId_userId: { postId, userId } },
      }),
    ]);

    return {
      upvoteCount: post.upvoteCount,
      commentCount: post.commentCount,
      isUpvoted: Boolean(upvote),
      isBookmarked: Boolean(bookmark),
    };
  }

  async submitExercise(
    userId: string,
    postId: string,
    answer: Record<string, unknown>,
  ): Promise<CommunityExerciseSubmissionDto> {
    const post = await this.getActivePostOrThrow(postId);
    if (post.type !== CommunityPostType.EXERCISE || !post.exercise) {
      throw new BadRequestException('This post is not an exercise');
    }

    const exercise = post.exercise;

    const existing = await this.prisma.communityExerciseSubmission.findUnique({
      where: { exerciseId_userId: { exerciseId: exercise.id, userId } },
    });
    if (existing) {
      throw new ConflictException('You have already submitted this exercise');
    }

    const { isCorrect, score } = this.gradeSubmission(exercise, answer);

    const submission = await this.prisma.$transaction(async (tx) => {
      const created = await tx.communityExerciseSubmission.create({
        data: {
          exerciseId: exercise.id,
          userId,
          answer: answer as Prisma.InputJsonValue,
          isCorrect,
          score,
        },
      });

      await tx.communityPost.update({
        where: { id: postId },
        data: {
          submissionCount: { increment: 1 },
          lastActivityAt: new Date(),
        },
      });

      return created;
    });

    return toCommunitySubmissionDto(submission);
  }

  private gradeSubmission(
    exercise: { exerciseType: string; correctAnswer: unknown },
    answer: Record<string, unknown>,
  ): { isCorrect: boolean | null; score: number | null } {
    if (!exercise.correctAnswer) {
      return { isCorrect: null, score: null };
    }

    if (exercise.exerciseType === 'MULTIPLE_CHOICE') {
      const correct = exercise.correctAnswer as { optionIds?: string[] };
      const submitted = answer as { optionIds?: string[] };
      const correctIds = [...(correct.optionIds ?? [])].sort().join(',');
      const submittedIds = [...(submitted.optionIds ?? [])].sort().join(',');
      const isCorrect = correctIds === submittedIds && correctIds.length > 0;
      return { isCorrect, score: isCorrect ? 100 : 0 };
    }

    if (exercise.exerciseType === 'FILL_IN_BLANK') {
      const correct = exercise.correctAnswer as {
        blanks?: { id: string; answers: string[] }[];
      };
      const submitted = answer as {
        blanks?: { id: string; value: string }[];
      };
      const correctBlanks = correct.blanks ?? [];
      const submittedBlanks = submitted.blanks ?? [];
      if (correctBlanks.length === 0) {
        return { isCorrect: null, score: null };
      }
      let matched = 0;
      for (const blank of correctBlanks) {
        const value =
          submittedBlanks.find((b) => b.id === blank.id)?.value?.trim().toLowerCase() ??
          '';
        const accepted = blank.answers.map((a) => a.trim().toLowerCase());
        if (accepted.includes(value)) {
          matched += 1;
        }
      }
      const score = Math.round((matched / correctBlanks.length) * 100);
      return { isCorrect: score === 100, score };
    }

    if (exercise.exerciseType === 'READING' || exercise.exerciseType === 'LISTENING') {
      const correct = exercise.correctAnswer as {
        questions?: { id: string; optionIds?: string[] }[];
      };
      const submitted = answer as {
        questions?: { id: string; optionIds?: string[] }[];
      };
      const correctQuestions = correct.questions ?? [];
      if (correctQuestions.length === 0) {
        return { isCorrect: null, score: null };
      }
      let matched = 0;
      for (const question of correctQuestions) {
        const submittedQuestion = submitted.questions?.find((q) => q.id === question.id);
        const correctIds = [...(question.optionIds ?? [])].sort().join(',');
        const submittedIds = [...(submittedQuestion?.optionIds ?? [])].sort().join(',');
        if (correctIds === submittedIds && correctIds.length > 0) {
          matched += 1;
        }
      }
      const score = Math.round((matched / correctQuestions.length) * 100);
      return { isCorrect: score === 100, score };
    }

    return { isCorrect: null, score: null };
  }

  async listMySubmissions(
    userId: string,
    postId: string,
  ): Promise<CommunityExerciseSubmissionDto[]> {
    const post = await this.getActivePostOrThrow(postId);
    if (!post.exercise) {
      throw new BadRequestException('This post is not an exercise');
    }

    const submissions = await this.prisma.communityExerciseSubmission.findMany({
      where: { exerciseId: post.exercise.id, userId },
      orderBy: { createdAt: 'asc' },
    });

    return submissions.map(toCommunitySubmissionDto);
  }

  async createReport(
    userId: string,
    payload: {
      postId?: string;
      commentId?: string;
      reason: string;
      description?: string;
    },
  ): Promise<{ success: true }> {
    if (!payload.postId && !payload.commentId) {
      throw new BadRequestException('Either postId or commentId is required');
    }
    if (payload.postId && payload.commentId) {
      throw new BadRequestException('Report either a post or a comment, not both');
    }

    if (payload.postId) {
      await this.getActivePostOrThrow(payload.postId);
    }
    if (payload.commentId) {
      const comment = await this.prisma.communityComment.findUnique({
        where: { id: payload.commentId },
      });
      if (!comment) {
        throw new NotFoundException('Comment not found');
      }
    }

    await this.prisma.communityReport.create({
      data: {
        postId: payload.postId ?? null,
        commentId: payload.commentId ?? null,
        reporterId: userId,
        reason: payload.reason as never,
        description: payload.description?.trim() ?? null,
      },
    });

    return { success: true };
  }
}
