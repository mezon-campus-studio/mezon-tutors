import type {
  CommunityComment,
  CommunityExercise,
  CommunityPost,
  CommunityPostMedia,
  CommunityTag,
  Prisma,
  User,
} from '@mezon-tutors/db';
import type {
  CommunityCommentDto,
  CommunityExerciseDto,
  CommunityExerciseSubmissionDto,
  CommunityMediaDto,
  CommunityPostDetailDto,
  CommunityPostListItemDto,
} from '@mezon-tutors/shared';

export type CommunityPostWithRelations = CommunityPost & {
  tags: CommunityTag[];
  media: CommunityPostMedia[];
  author: Pick<User, 'id' | 'username' | 'avatar'>;
  exercise?: CommunityExercise | null;
};

export const communityPostInclude = {
  tags: true,
  media: { orderBy: { sortOrder: 'asc' } },
  author: { select: { id: true, username: true, avatar: true } },
  exercise: true,
} satisfies Prisma.CommunityPostInclude;

function toMediaDto(media: CommunityPostMedia): CommunityMediaDto {
  return {
    id: media.id,
    type: media.type,
    url: media.url,
    sortOrder: media.sortOrder,
    metadata: media.metadata as Record<string, unknown> | null,
  };
}

function toExerciseSummary(
  exercise: CommunityExercise,
  submissionCount: number,
): CommunityExerciseDto {
  return {
    id: exercise.id,
    exerciseType: exercise.exerciseType,
    difficulty: exercise.difficulty,
    explanation: exercise.explanation,
    payload: exercise.payload as Record<string, unknown>,
    correctAnswer: exercise.correctAnswer as Record<string, unknown> | null,
    submissionCount,
  };
}

export function toCommunityPostListItemDto(
  post: CommunityPostWithRelations,
  options?: {
    isUpvoted?: boolean;
    isBookmarked?: boolean;
    isMine?: boolean;
  },
): CommunityPostListItemDto {
  return {
    id: post.id,
    type: post.type,
    content: post.content,
    publishedAt: post.publishedAt.toISOString(),
    upvoteCount: post.upvoteCount,
    commentCount: post.commentCount,
    bookmarkCount: post.bookmarkCount,
    submissionCount: post.submissionCount,
    tags: post.tags.map((tag) => ({
      id: tag.id,
      slug: tag.slug,
      name: tag.name,
    })),
    author: {
      id: post.author.id,
      username: post.author.username,
      avatar: post.author.avatar,
    },
    media: post.media.map(toMediaDto),
    exercise: post.exercise
      ? {
          exerciseType: post.exercise.exerciseType,
          difficulty: post.exercise.difficulty,
        }
      : null,
    isUpvoted: options?.isUpvoted,
    isBookmarked: options?.isBookmarked,
    isMine: options?.isMine,
  };
}

export function toCommunityPostDetailDto(
  post: CommunityPostWithRelations,
  options?: {
    isUpvoted?: boolean;
    isBookmarked?: boolean;
    isMine?: boolean;
  },
): CommunityPostDetailDto {
  const base = toCommunityPostListItemDto(post, options);
  return {
    ...base,
    exercise: post.exercise
      ? toExerciseSummary(post.exercise, post.submissionCount)
      : null,
  };
}

export function toCommunityCommentDto(
  comment: CommunityComment & {
    author: Pick<User, 'id' | 'username' | 'avatar'>;
  },
  options: {
    userId?: string;
    isUpvoted: boolean;
    replies?: CommunityCommentDto[];
  },
): CommunityCommentDto {
  const isDeleted = Boolean(comment.deletedAt);
  return {
    id: comment.id,
    content: isDeleted ? null : comment.content,
    createdAt: comment.createdAt.toISOString(),
    author: {
      id: comment.author.id,
      username: comment.author.username,
      avatar: comment.author.avatar,
    },
    isMine: options.userId === comment.authorId,
    isDeleted,
    parentId: comment.parentId,
    upvoteCount: comment.upvoteCount,
    isUpvoted: options.isUpvoted,
    replies: options.replies ?? [],
  };
}

export function toCommunitySubmissionDto(
  submission: {
    id: string;
    answer: unknown;
    score: number | null;
    isCorrect: boolean | null;
    aiFeedback: unknown;
    createdAt: Date;
  },
): CommunityExerciseSubmissionDto {
  return {
    id: submission.id,
    answer: submission.answer as Record<string, unknown>,
    score: submission.score,
    isCorrect: submission.isCorrect,
    aiFeedback: submission.aiFeedback as Record<string, unknown> | null,
    createdAt: submission.createdAt.toISOString(),
  };
}
