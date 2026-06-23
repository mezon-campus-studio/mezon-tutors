export const BLOG_PUBLISH_STATUS_FILTERS = [
  'all',
  'PENDING',
  'PUBLISHED',
  'UPDATE_PENDING',
  'REJECTED',
  'CLOSED',
] as const;

export type BlogPublishStatusFilter = (typeof BLOG_PUBLISH_STATUS_FILTERS)[number];

export const BLOG_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const BLOG_CONTENT_LIMITS = {
  title: 200,
  slug: 200,
  excerpt: 500,
  content: 50000,
  seoTitle: 120,
  seoDescription: 320,
  tagName: 120,
  rejectedReason: 1000,
  comment: 2000,
} as const;
