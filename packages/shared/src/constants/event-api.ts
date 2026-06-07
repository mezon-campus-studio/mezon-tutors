export const EVENT_PUBLISH_STATUS_FILTERS = [
  'all',
  'PENDING',
  'PUBLISHED',
  'UPDATE_PENDING',
  'REJECTED',
  'CLOSED',
] as const;

export type EventPublishStatusFilter =
  (typeof EVENT_PUBLISH_STATUS_FILTERS)[number];

export const EVENT_ORGANIZER_GRADIENTS = [
  'from-violet-600 to-fuchsia-500',
  'from-indigo-600 to-violet-500',
  'from-fuchsia-600 to-rose-500',
  'from-purple-600 to-indigo-500',
  'from-cyan-600 to-blue-500',
  'from-emerald-600 to-teal-500',
] as const;

export const EVENT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const EVENT_CONTENT_LIMITS = {
  title: 120,
  tagline: 240,
  theme: 60,
  aboutBody: 4000,
  aboutHighlight: 500,
  seoTitle: 120,
  seoDescription: 320,
  organizerName: 120,
  organizerRole: 120,
  organizerCategory: 60,
  organizerBio: 2000,
  statValue: 20,
  statLabel: 60,
  galleryCaption: 200,
  slug: 120,
  rejectedReason: 1000,
} as const;
