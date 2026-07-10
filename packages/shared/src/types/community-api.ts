import type { PaginationMeta } from './pagination';

export type CommunityPostType = 'POST' | 'QUESTION' | 'EXERCISE';

export type CommunityExerciseType =
  | 'MULTIPLE_CHOICE'
  | 'FILL_IN_BLANK'
  | 'READING'
  | 'LISTENING';

export type CommunityExerciseDifficulty =
  | 'BEGINNER'
  | 'INTERMEDIATE'
  | 'ADVANCED';

export type CommunityMediaType = 'IMAGE' | 'VIDEO' | 'AUDIO';

export type CommunityReportReason =
  | 'SPAM'
  | 'HARASSMENT'
  | 'INAPPROPRIATE'
  | 'MISINFORMATION'
  | 'OTHER';

export type CommunityAuthorDto = {
  id: string;
  username: string;
  avatar: string;
};

export type CommunityTagDto = {
  id: string;
  slug: string;
  name: string;
};

export type CommunityMediaDto = {
  id: string;
  type: CommunityMediaType;
  url: string;
  sortOrder: number;
  metadata?: Record<string, unknown> | null;
};

export type CommunityExerciseDto = {
  id: string;
  exerciseType: CommunityExerciseType;
  difficulty: CommunityExerciseDifficulty;
  explanation?: string | null;
  payload: Record<string, unknown>;
  correctAnswer?: Record<string, unknown> | null;
  submissionCount: number;
};

export type CommunityPostListItemDto = {
  id: string;
  type: CommunityPostType;
  content: string;
  publishedAt: string;
  upvoteCount: number;
  commentCount: number;
  submissionCount: number;
  correctCount?: number;
  incorrectCount?: number;
  tags: CommunityTagDto[];
  author: CommunityAuthorDto;
  media: CommunityMediaDto[];
  exercise?: Pick<
    CommunityExerciseDto,
    'exerciseType' | 'difficulty'
  > | null;
  isUpvoted?: boolean;
  isMine?: boolean;
  mySubmissionResult?: 'correct' | 'incorrect' | 'unanswered';
};

export type CommunityPostDetailDto = CommunityPostListItemDto & {
  exercise?: CommunityExerciseDto | null;
};

export type CommunityFeedResultDto = {
  data: CommunityPostListItemDto[];
  meta: {
    nextCursor: string | null;
    hasMore: boolean;
  };
};

export type CommunityTagListItemDto = CommunityTagDto & {
  postCount: number;
};

export type CommunityCommentDto = {
  id: string;
  content: string | null;
  createdAt: string;
  author: CommunityAuthorDto;
  isMine: boolean;
  isDeleted: boolean;
  parentId: string | null;
  upvoteCount: number;
  isUpvoted: boolean;
  replies: CommunityCommentDto[];
};

export type CommunityEngagementDto = {
  upvoteCount: number;
  commentCount: number;
  isUpvoted: boolean;
};

export type ToggleCommunityUpvoteResultDto = {
  upvoted: boolean;
  upvoteCount: number;
};

export type ToggleCommunityFollowResultDto = {
  following: boolean;
};

export type CommunityExerciseSubmissionDto = {
  id: string;
  answer: Record<string, unknown>;
  score?: number | null;
  isCorrect?: boolean | null;
  aiFeedback?: Record<string, unknown> | null;
  createdAt: string;
};

export type CreateCommunityMediaPayload = {
  type: CommunityMediaType;
  url: string;
  sortOrder?: number;
  metadata?: Record<string, unknown>;
};

export type CreateCommunityExercisePayload = {
  exerciseType: CommunityExerciseType;
  difficulty?: CommunityExerciseDifficulty;
  explanation?: string;
  payload: Record<string, unknown>;
  correctAnswer?: Record<string, unknown>;
};

export type CreateCommunityPostPayload = {
  type: CommunityPostType;
  content: string;
  tagIds?: string[];
  tagNames?: string[];
  media?: CreateCommunityMediaPayload[];
  exercise?: CreateCommunityExercisePayload;
};

export type UpdateCommunityPostPayload = Partial<
  Omit<CreateCommunityPostPayload, 'type' | 'exercise'>
>;

export type CreateCommunityCommentPayload = {
  content: string;
  parentId?: string;
};

export type CreateCommunitySubmissionPayload = {
  answer: Record<string, unknown>;
};

export type CreateCommunityReportPayload = {
  postId?: string;
  commentId?: string;
  reason: CommunityReportReason;
  description?: string;
};

export type CommunitySearchResultDto = {
  data: CommunityPostListItemDto[];
  meta: PaginationMeta;
};
