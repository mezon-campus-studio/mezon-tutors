export const COMMUNITY_CONTENT_LIMITS = {
  content: 50_000,
  comment: 5_000,
  tagName: 80,
} as const;

export const COMMUNITY_MAX_COMMENT_DEPTH = 4;

export const COMMUNITY_FEED_SORTS = [
  'latest',
  'trending',
  'most_upvoted',
] as const;

export type CommunityFeedSort = (typeof COMMUNITY_FEED_SORTS)[number];
