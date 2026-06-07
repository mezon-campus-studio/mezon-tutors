import type {
  Event,
  EventGalleryImage,
  EventOrganizer,
  EventStat,
  User,
} from '@mezon-tutors/db';
import type {
  CreateEventPayload,
  EventDetailDto,
  EventListItemDto,
  EventLocaleContent,
  EventLocationDto,
} from '@mezon-tutors/shared';
import { computeEventLifecycleStatus } from '@mezon-tutors/shared';

export type EventWithRelations = Event & {
  organizers: EventOrganizer[];
  gallery: EventGalleryImage[];
  stats: EventStat[];
  createdBy?: Pick<User, 'id' | 'username' | 'email'> | null;
  reviewedBy?: Pick<User, 'id' | 'username'> | null;
};

function toLocationDto(event: Event): EventLocationDto | null {
  if (event.isOnline && !event.city && !event.venue) {
    return { isOnline: true, city: null, country: null, venue: null };
  }
  if (!event.isOnline || event.city || event.venue) {
    return {
      isOnline: event.isOnline,
      city: event.city,
      country: event.country,
      venue: event.venue,
    };
  }
  return null;
}

function parseContent(value: unknown): EventLocaleContent {
  return value as EventLocaleContent;
}

export function toEventListItemDto(
  event: EventWithRelations,
  locale: 'vi' | 'en' = 'vi',
): EventListItemDto {
  const contentVi = parseContent(event.contentVi);
  const contentEn = event.contentEn ? parseContent(event.contentEn) : null;

  return {
    id: event.id,
    slug: event.slug,
    publishStatus: event.publishStatus,
    lifecycleStatus: computeEventLifecycleStatus(event.startAt, event.endAt),
    startAt: event.startAt.toISOString(),
    endAt: event.endAt?.toISOString() ?? null,
    doorsOpenAt: event.doorsOpenAt?.toISOString() ?? null,
    location: toLocationDto(event),
    registrationUrl: event.registrationUrl,
    coverImageUrl: event.coverImageUrl,
    ogImageUrl: event.ogImageUrl,
    content: {
      vi: contentVi,
      en: contentEn,
    },
    createdAt: event.createdAt.toISOString(),
    rejectedReason: event.rejectedReason,
    updateReviewStatus: event.updateReviewStatus,
    updateSubmittedAt: event.updateSubmittedAt?.toISOString() ?? null,
  };
}

export function toEventDetailDto(
  event: EventWithRelations,
  locale: 'vi' | 'en' = 'vi',
): EventDetailDto {
  const base = toEventListItemDto(event, locale);

  return {
    ...base,
    organizers: event.organizers
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((organizer) => ({
        id: organizer.id,
        name: organizer.name,
        role: organizer.role,
        category: organizer.category,
        bio: organizer.bio,
        imageUrl: organizer.imageUrl,
        gradient: organizer.gradient,
        sortOrder: organizer.sortOrder,
      })),
    galleryImages: event.gallery
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((image) => ({
        id: image.id,
        imageUrl: image.imageUrl,
        caption:
          locale === 'en' && image.captionEn
            ? image.captionEn
            : image.captionVi,
        sortOrder: image.sortOrder,
      })),
    stats: event.stats
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((stat) => ({
        id: stat.id,
        value: stat.value,
        label:
          locale === 'en' && stat.labelEn ? stat.labelEn : stat.labelVi,
        sortOrder: stat.sortOrder,
      })),
    rejectedReason: event.rejectedReason,
    publishedAt: event.publishedAt?.toISOString() ?? null,
    createdBy: event.createdBy
      ? {
          id: event.createdBy.id,
          username: event.createdBy.username,
          email: event.createdBy.email,
        }
      : null,
    reviewedBy: event.reviewedBy
      ? {
          id: event.reviewedBy.id,
          username: event.reviewedBy.username,
        }
      : null,
    pendingUpdate: event.pendingUpdate
      ? (event.pendingUpdate as CreateEventPayload)
      : null,
    updateRejectedReason: event.updateRejectedReason,
  };
}
