import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EventPublishStatus,
  EventUpdateReviewStatus,
  Prisma,
} from '@mezon-tutors/db';
import type {
  CreateEventPayload,
  EventDetailDto,
  EventListItemDto,
  EventMetricsDto,
  EventPublishStatusFilter,
} from '@mezon-tutors/shared';
import { EVENT_ORGANIZER_GRADIENTS, EVENT_SLUG_PATTERN } from '@mezon-tutors/shared';
import { PrismaService } from '../../prisma/prisma.service';
import {
  toEventDetailDto,
  toEventListItemDto,
  type EventWithRelations,
} from './event.mapper';

const eventInclude = {
  organizers: true,
  gallery: true,
  stats: true,
  createdBy: { select: { id: true, username: true, email: true } },
  reviewedBy: { select: { id: true, username: true } },
} satisfies Prisma.EventInclude;

function slugifyTitle(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

@Injectable()
export class EventService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveUniqueSlug(
    preferred?: string,
    fallbackTitle?: string,
  ): Promise<string> {
    const base = (preferred?.trim() || slugifyTitle(fallbackTitle ?? 'event'))
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (!base || !EVENT_SLUG_PATTERN.test(base)) {
      throw new BadRequestException('Invalid event slug');
    }

    let candidate = base;
    let suffix = 1;
    while (true) {
      const existing = await this.prisma.event.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });
      if (!existing) return candidate;
      suffix += 1;
      candidate = `${base}-${suffix}`;
    }
  }

  async listPublished(): Promise<EventListItemDto[]> {
    const events = await this.prisma.event.findMany({
      where: { publishStatus: EventPublishStatus.PUBLISHED },
      include: eventInclude,
      orderBy: { startAt: 'asc' },
    });
    return events.map((event) => toEventListItemDto(event));
  }

  async getPublishedBySlug(slug: string): Promise<EventDetailDto> {
    const event = await this.prisma.event.findFirst({
      where: { slug, publishStatus: EventPublishStatus.PUBLISHED },
      include: eventInclude,
    });
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    return toEventDetailDto(event);
  }

  async createPending(
    userId: string,
    payload: CreateEventPayload,
  ): Promise<EventDetailDto> {
    const slug = await this.resolveUniqueSlug(
      payload.slug,
      payload.contentVi.title,
    );

    const event = await this.prisma.event.create({
      data: {
        slug,
        publishStatus: EventPublishStatus.PENDING,
        startAt: new Date(payload.startAt),
        endAt: payload.endAt ? new Date(payload.endAt) : null,
        doorsOpenAt: payload.doorsOpenAt ? new Date(payload.doorsOpenAt) : null,
        isOnline: payload.isOnline,
        city: payload.city?.trim() || null,
        country: payload.country?.trim() || null,
        venue: payload.venue?.trim() || null,
        registrationUrl: payload.registrationUrl,
        coverImageUrl: payload.coverImageUrl,
        ogImageUrl: payload.ogImageUrl,
        contentVi: payload.contentVi,
        contentEn: payload.contentEn ?? undefined,
        createdById: userId,
        organizers: {
          create: payload.organizers.map((organizer, index) => ({
            sortOrder: index,
            name: organizer.name.trim(),
            role: organizer.role.trim(),
            category: organizer.category.trim(),
            bio: organizer.bio?.trim() || null,
            imageUrl: organizer.imageUrl,
            gradient:
              organizer.gradient?.trim() ||
              EVENT_ORGANIZER_GRADIENTS[index % EVENT_ORGANIZER_GRADIENTS.length],
          })),
        },
        gallery: {
          create: payload.galleryImages.map((image, index) => ({
            sortOrder: index,
            imageUrl: image.imageUrl,
            captionVi: image.captionVi?.trim() || null,
            captionEn: image.captionEn?.trim() || null,
          })),
        },
        stats: {
          create: payload.stats.map((stat, index) => ({
            sortOrder: index,
            value: stat.value.trim(),
            labelVi: stat.labelVi.trim(),
            labelEn: stat.labelEn?.trim() || null,
          })),
        },
      },
      include: eventInclude,
    });

    return toEventDetailDto(event as EventWithRelations);
  }

  async listMySubmissions(userId: string): Promise<EventListItemDto[]> {
    const events = await this.prisma.event.findMany({
      where: { createdById: userId },
      include: eventInclude,
      orderBy: { createdAt: 'desc' },
    });
    return events.map((event) => toEventListItemDto(event));
  }

  async getMySubmissionById(
    userId: string,
    id: string,
  ): Promise<EventDetailDto> {
    const event = await this.prisma.event.findFirst({
      where: { id, createdById: userId },
      include: eventInclude,
    });
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    return toEventDetailDto(event);
  }

  private buildEventUpdateData(payload: CreateEventPayload) {
    return {
      startAt: new Date(payload.startAt),
      endAt: payload.endAt ? new Date(payload.endAt) : null,
      doorsOpenAt: payload.doorsOpenAt ? new Date(payload.doorsOpenAt) : null,
      isOnline: payload.isOnline,
      city: payload.city?.trim() || null,
      country: payload.country?.trim() || null,
      venue: payload.venue?.trim() || null,
      registrationUrl: payload.registrationUrl,
      coverImageUrl: payload.coverImageUrl,
      ogImageUrl: payload.ogImageUrl,
      contentVi: payload.contentVi,
      contentEn: payload.contentEn ?? undefined,
      organizers: {
        create: payload.organizers.map((organizer, index) => ({
          sortOrder: index,
          name: organizer.name.trim(),
          role: organizer.role.trim(),
          category: organizer.category.trim(),
          bio: organizer.bio?.trim() || null,
          imageUrl: organizer.imageUrl,
          gradient:
            organizer.gradient?.trim() ||
            EVENT_ORGANIZER_GRADIENTS[index % EVENT_ORGANIZER_GRADIENTS.length],
        })),
      },
      gallery: {
        create: payload.galleryImages.map((image, index) => ({
          sortOrder: index,
          imageUrl: image.imageUrl,
          captionVi: image.captionVi?.trim() || null,
          captionEn: image.captionEn?.trim() || null,
        })),
      },
      stats: {
        create: payload.stats.map((stat, index) => ({
          sortOrder: index,
          value: stat.value.trim(),
          labelVi: stat.labelVi.trim(),
          labelEn: stat.labelEn?.trim() || null,
        })),
      },
    };
  }

  private async applyLiveEventData(
    id: string,
    payload: CreateEventPayload,
    extra?: Prisma.EventUpdateInput,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.eventOrganizer.deleteMany({ where: { eventId: id } });
      await tx.eventGalleryImage.deleteMany({ where: { eventId: id } });
      await tx.eventStat.deleteMany({ where: { eventId: id } });

      return tx.event.update({
        where: { id },
        data: {
          ...this.buildEventUpdateData(payload),
          ...extra,
        },
        include: eventInclude,
      });
    });
  }

  async updateMySubmission(
    userId: string,
    id: string,
    payload: CreateEventPayload,
  ): Promise<EventDetailDto> {
    const existing = await this.prisma.event.findFirst({
      where: { id, createdById: userId },
    });
    if (!existing) {
      throw new NotFoundException('Event not found');
    }
    if (existing.publishStatus === EventPublishStatus.CLOSED) {
      throw new ForbiddenException('Closed events cannot be edited');
    }
    if (existing.publishStatus === EventPublishStatus.PUBLISHED) {
      const event = await this.prisma.event.update({
        where: { id },
        data: {
          pendingUpdate: payload as Prisma.InputJsonValue,
          updateReviewStatus: EventUpdateReviewStatus.PENDING,
          updateSubmittedAt: new Date(),
          updateRejectedReason: null,
        },
        include: eventInclude,
      });
      return toEventDetailDto(event as EventWithRelations);
    }

    const event = await this.applyLiveEventData(id, payload, {
      publishStatus: EventPublishStatus.PENDING,
      rejectedReason: null,
      publishedAt: null,
      reviewedBy: { disconnect: true },
      pendingUpdate: Prisma.JsonNull,
      updateReviewStatus: null,
      updateRejectedReason: null,
      updateSubmittedAt: null,
    });

    return toEventDetailDto(event as EventWithRelations);
  }

  async listAdmin(
    status?: EventPublishStatusFilter,
  ): Promise<EventListItemDto[]> {
    const where =
      status === 'UPDATE_PENDING'
        ? { updateReviewStatus: EventUpdateReviewStatus.PENDING }
        : status && status !== 'all'
          ? { publishStatus: status as EventPublishStatus }
          : undefined;

    const events = await this.prisma.event.findMany({
      where,
      include: eventInclude,
      orderBy: [{ publishStatus: 'asc' }, { createdAt: 'desc' }],
    });
    return events.map((event) => toEventListItemDto(event));
  }

  async getAdminById(id: string): Promise<EventDetailDto> {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: eventInclude,
    });
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    return toEventDetailDto(event);
  }

  async getMetrics(): Promise<EventMetricsDto> {
    const [pending, published, rejected, closed, pendingUpdates, total] =
      await Promise.all([
        this.prisma.event.count({
          where: { publishStatus: EventPublishStatus.PENDING },
        }),
        this.prisma.event.count({
          where: { publishStatus: EventPublishStatus.PUBLISHED },
        }),
        this.prisma.event.count({
          where: { publishStatus: EventPublishStatus.REJECTED },
        }),
        this.prisma.event.count({
          where: { publishStatus: EventPublishStatus.CLOSED },
        }),
        this.prisma.event.count({
          where: { updateReviewStatus: EventUpdateReviewStatus.PENDING },
        }),
        this.prisma.event.count(),
      ]);
    return { pending, published, rejected, closed, pendingUpdates, total };
  }

  async publish(id: string, reviewerId: string): Promise<EventDetailDto> {
    const existing = await this.prisma.event.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Event not found');
    }
    if (existing.publishStatus === EventPublishStatus.PUBLISHED) {
      throw new ConflictException('Event is already published');
    }

    const event = await this.prisma.event.update({
      where: { id },
      data: {
        publishStatus: EventPublishStatus.PUBLISHED,
        publishedAt: new Date(),
        reviewedById: reviewerId,
        rejectedReason: null,
      },
      include: eventInclude,
    });
    return toEventDetailDto(event);
  }

  async reject(
    id: string,
    reviewerId: string,
    reason: string,
  ): Promise<EventDetailDto> {
    const existing = await this.prisma.event.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Event not found');
    }

    const event = await this.prisma.event.update({
      where: { id },
      data: {
        publishStatus: EventPublishStatus.REJECTED,
        rejectedReason: reason.trim(),
        reviewedById: reviewerId,
        publishedAt: null,
      },
      include: eventInclude,
    });
    return toEventDetailDto(event);
  }

  async close(id: string, reviewerId: string): Promise<EventDetailDto> {
    const existing = await this.prisma.event.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Event not found');
    }
    if (existing.publishStatus !== EventPublishStatus.PUBLISHED) {
      throw new BadRequestException('Only published events can be closed');
    }

    const event = await this.prisma.event.update({
      where: { id },
      data: {
        publishStatus: EventPublishStatus.CLOSED,
        reviewedById: reviewerId,
        pendingUpdate: Prisma.JsonNull,
        updateReviewStatus: null,
        updateRejectedReason: null,
        updateSubmittedAt: null,
      },
      include: eventInclude,
    });
    return toEventDetailDto(event);
  }

  async approveEventUpdate(
    id: string,
    reviewerId: string,
  ): Promise<EventDetailDto> {
    const existing = await this.prisma.event.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Event not found');
    }
    if (existing.updateReviewStatus !== EventUpdateReviewStatus.PENDING) {
      throw new BadRequestException('No pending update to approve');
    }
    if (!existing.pendingUpdate) {
      throw new BadRequestException('Pending update payload is missing');
    }

    const payload = existing.pendingUpdate as CreateEventPayload;
    const event = await this.applyLiveEventData(id, payload, {
      publishStatus: EventPublishStatus.PUBLISHED,
      publishedAt: existing.publishedAt ?? new Date(),
      reviewedBy: { connect: { id: reviewerId } },
      rejectedReason: null,
      pendingUpdate: Prisma.JsonNull,
      updateReviewStatus: null,
      updateRejectedReason: null,
      updateSubmittedAt: null,
    });

    return toEventDetailDto(event as EventWithRelations);
  }

  async rejectEventUpdate(
    id: string,
    reviewerId: string,
    reason: string,
  ): Promise<EventDetailDto> {
    const existing = await this.prisma.event.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Event not found');
    }
    if (existing.updateReviewStatus !== EventUpdateReviewStatus.PENDING) {
      throw new BadRequestException('No pending update to reject');
    }

    const event = await this.prisma.event.update({
      where: { id },
      data: {
        pendingUpdate: Prisma.JsonNull,
        updateReviewStatus: EventUpdateReviewStatus.REJECTED,
        updateRejectedReason: reason.trim(),
        reviewedById: reviewerId,
      },
      include: eventInclude,
    });
    return toEventDetailDto(event);
  }
}
