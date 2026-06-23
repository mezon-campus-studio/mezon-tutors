export type BlogPublishStatus = 'PENDING' | 'PUBLISHED' | 'REJECTED' | 'CLOSED';

export type BlogUpdateReviewStatus = 'PENDING' | 'REJECTED';

export type BlogTagDto = {
  id: string;
  slug: string;
  name: string;
};

export type BlogAuthorDto = {
  id: string;
  username: string;
  avatar: string;
};

export type BlogCreatorDto = {
  id: string;
  username: string;
  email: string | null;
};

export type BlogPostListItemDto = {
  id: string;
  slug: string;
  title: string;
  excerpt?: string | null;
  coverImageUrl?: string | null;
  readingTime: number;
  upvoteCount: number;
  upvotesToday?: number;
  upvotesThisWeek?: number;
  commentsToday?: number;
  commentUpvotesToday?: number;
  publishStatus: BlogPublishStatus;
  createdAt: string;
  publishedAt?: string | null;
  rejectedReason?: string | null;
  updateReviewStatus?: BlogUpdateReviewStatus | null;
  updateSubmittedAt?: string | null;
  tags: BlogTagDto[];
  author: BlogAuthorDto | null;
};

export type BlogPostDetailDto = BlogPostListItemDto & {
  content: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  ogImageUrl?: string | null;
  upvoteCount: number;
  commentCount: number;
  createdBy?: BlogCreatorDto | null;
  reviewedBy?: Pick<BlogCreatorDto, 'id' | 'username'> | null;
  pendingUpdate?: CreateBlogPayload | null;
  updateRejectedReason?: string | null;
};

export type BlogMetricsDto = {
  pending: number;
  published: number;
  rejected: number;
  closed: number;
  pendingUpdates: number;
  total: number;
};

export type CreateBlogPayload = {
  title: string;
  content: string;
  slug?: string;
  excerpt?: string;
  coverImageUrl?: string;
  seoTitle?: string;
  seoDescription?: string;
  ogImageUrl?: string;
  tagIds?: string[];
  tagNames?: string[];
};

export type RejectBlogPayload = {
  reason: string;
};

export type BlogTagListItemDto = BlogTagDto & {
  postCount: number;
};

export type BlogCommentDto = {
  id: string;
  content: string;
  createdAt: string;
  author: BlogAuthorDto;
  isMine: boolean;
  parentId: string | null;
  upvoteCount: number;
  isUpvoted: boolean;
  replies: BlogCommentDto[];
};

export type BlogEngagementDto = {
  upvoteCount: number;
  commentCount: number;
  isUpvoted: boolean;
};

export type ToggleBlogUpvoteResultDto = {
  upvoted: boolean;
  upvoteCount: number;
};

export type ToggleCommentUpvoteResultDto = {
  upvoted: boolean;
  upvoteCount: number;
};

export type CreateBlogCommentPayload = {
  content: string;
  parentId?: string;
};
