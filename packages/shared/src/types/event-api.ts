import type { EventStatus } from './event';

export type EventPublishStatus = 'PENDING' | 'PUBLISHED' | 'REJECTED' | 'CLOSED';

export type EventUpdateReviewStatus = 'PENDING' | 'REJECTED';

export type EventLocaleContent = {
  title: string;
  tagline: string;
  theme: string;
  aboutTitle?: string;
  aboutBody: string;
  aboutHighlight?: string;
  seoTitle?: string;
  seoDescription?: string;
  registerTitle?: string;
  registerDescription?: string;
  priceLabel?: string;
  cardDescription?: string;
  cardTag?: string;
  marquee?: string;
};

export type EventLocationDto = {
  city?: string | null;
  country?: string | null;
  isOnline: boolean;
  venue?: string | null;
};

export type EventOrganizerDto = {
  id: string;
  name: string;
  role: string;
  category: string;
  bio?: string | null;
  imageUrl: string;
  gradient: string;
  sortOrder: number;
};

export type EventGalleryImageDto = {
  id: string;
  imageUrl: string;
  caption?: string | null;
  sortOrder: number;
};

export type EventStatDto = {
  id: string;
  value: string;
  label: string;
  sortOrder: number;
};

export type EventCreatorDto = {
  id: string;
  username: string;
  email: string | null;
};

export type ImageCropData = {
  x: number;
  y: number;
  zoom?: number;
};

export type EventListItemDto = {
  id: string;
  slug: string;
  publishStatus: EventPublishStatus;
  lifecycleStatus: EventStatus;
  startAt: string;
  endAt?: string | null;
  doorsOpenAt?: string | null;
  location?: EventLocationDto | null;
  registrationUrl: string;
  coverImageUrl: string;
  coverImageCrop?: ImageCropData | null;
  ogImageUrl: string;
  content: EventLocaleContent;
  createdAt: string;
  rejectedReason?: string | null;
  updateReviewStatus?: EventUpdateReviewStatus | null;
  updateSubmittedAt?: string | null;
};

export type EventDetailDto = EventListItemDto & {
  organizers: EventOrganizerDto[];
  galleryImages: EventGalleryImageDto[];
  stats: EventStatDto[];
  rejectedReason?: string | null;
  publishedAt?: string | null;
  createdBy?: EventCreatorDto | null;
  reviewedBy?: Pick<EventCreatorDto, 'id' | 'username'> | null;
  pendingUpdate?: CreateEventPayload | null;
  updateRejectedReason?: string | null;
};

export type EventMetricsDto = {
  pending: number;
  published: number;
  rejected: number;
  closed: number;
  pendingUpdates: number;
  total: number;
};

export type CreateEventOrganizerInput = {
  name: string;
  role: string;
  category: string;
  bio?: string;
  imageUrl: string;
  gradient?: string;
};

export type CreateEventGalleryImageInput = {
  imageUrl: string;
  caption?: string;
};

export type CreateEventStatInput = {
  value: string;
  label: string;
};

export type CreateEventPayload = {
  slug?: string;
  startAt: string;
  endAt?: string;
  doorsOpenAt?: string;
  isOnline: boolean;
  city?: string;
  country?: string;
  venue?: string;
  registrationUrl: string;
  coverImageUrl: string;
  coverImageCrop?: ImageCropData | null;
  ogImageUrl: string;
  content: EventLocaleContent;
  organizers: CreateEventOrganizerInput[];
  galleryImages: CreateEventGalleryImageInput[];
  stats: CreateEventStatInput[];
};

export type RejectEventPayload = {
  reason: string;
};
