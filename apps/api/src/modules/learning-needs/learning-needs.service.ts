import { isDeepStrictEqual } from 'node:util';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ELearningNeedsSyncStatus, EPaymentStatus, Prisma } from '@mezon-tutors/db';
import type {
  CurrentLearningNeedsPinDto,
  LearningNeedsAnswersV1,
  LearningNeedsBookingDto,
  LearningNeedsContextDto,
  LearningNeedsSharedSnapshotDto,
  LearningNeedsSyncDto,
} from '@mezon-tutors/shared';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  AssociateLearningNeedsChannelDto,
  LearningNeedsAnswersDto,
  SaveLearningNeedsDraftDto,
} from './dto/learning-needs.dto';

const bookingInclude = {
  tutor: {
    select: {
      id: true,
      userId: true,
      firstName: true,
      lastName: true,
      subject: true,
      user: { select: { avatar: true, mezonUserId: true } },
    },
  },
  student: { select: { mezonUserId: true } },
  learningNeeds: {
    include: { userDmChannel: { select: { channelId: true } } },
  },
} satisfies Prisma.TrialLessonBookingInclude;

type BookingWithContext = Prisma.TrialLessonBookingGetPayload<{
  include: typeof bookingInclude;
}>;

@Injectable()
export class LearningNeedsService {
  constructor(private readonly prisma: PrismaService) {}

  async getForBooking(userId: string, bookingId: string): Promise<LearningNeedsBookingDto> {
    const booking = await this.getAuthorizedBooking(userId, bookingId);
    const canEdit = booking.studentId === userId;
    let previousAnswers: LearningNeedsAnswersV1 | null = null;

    if (!booking.learningNeeds && canEdit) {
      const priorForSubject = await this.prisma.learningNeeds.findFirst({
        where: {
          studentId: userId,
          trialLessonBookingId: { not: bookingId },
          subjectSnapshot: { equals: booking.tutor.subject, mode: 'insensitive' },
        },
        orderBy: { updatedAt: 'desc' },
      });
      const prior =
        priorForSubject ??
        (await this.prisma.learningNeeds.findFirst({
          where: {
            studentId: userId,
            trialLessonBookingId: { not: bookingId },
          },
          orderBy: { updatedAt: 'desc' },
        }));
      if (prior?.draftAnswers || prior?.sharedAnswers) {
        const priorAnswers = (prior.draftAnswers ??
          prior.sharedAnswers) as unknown as LearningNeedsAnswersV1;
        previousAnswers = priorForSubject
          ? priorAnswers
          : this.reusableCrossSubjectPreferences(priorAnswers);
      }
    }

    return this.toBookingDto(booking, userId, previousAnswers);
  }

  async saveDraft(
    userId: string,
    bookingId: string,
    dto: SaveLearningNeedsDraftDto
  ): Promise<LearningNeedsBookingDto> {
    const booking = await this.getOwnedSuccessfulBooking(userId, bookingId);
    const answers = this.normalizeAndValidateAnswers(dto.answers);
    const current = booking.learningNeeds;

    if (
      current &&
      isDeepStrictEqual(current.draftAnswers, answers) &&
      (dto.expectedDraftRevision === undefined ||
        dto.expectedDraftRevision === current.draftRevision)
    ) {
      return this.getForBooking(userId, bookingId);
    }

    if (
      dto.expectedDraftRevision !== undefined &&
      dto.expectedDraftRevision !== (current?.draftRevision ?? 0)
    ) {
      throw new ConflictException('Learning needs draft has changed; reload and try again');
    }

    const channel = await this.findPairChannel(booking.studentId, booking.tutor.userId);
    if (!current) {
      try {
        await this.prisma.learningNeeds.create({
          data: {
            trialLessonBookingId: booking.id,
            studentId: booking.studentId,
            tutorProfileId: booking.tutorId,
            subjectSnapshot: booking.tutor.subject.trim() || 'General',
            draftAnswers: answers as Prisma.InputJsonValue,
            draftRevision: 1,
            userDmChannelId: channel?.id,
          },
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          throw new ConflictException('Learning needs draft has changed; reload and try again');
        }
        throw error;
      }
    } else {
      const result = await this.prisma.learningNeeds.updateMany({
        where: {
          id: current.id,
          ...(dto.expectedDraftRevision !== undefined
            ? { draftRevision: dto.expectedDraftRevision }
            : {}),
        },
        data: {
          draftAnswers: answers as Prisma.InputJsonValue,
          draftRevision: { increment: 1 },
          ...(channel ? { userDmChannelId: channel.id } : {}),
        },
      });
      if (result.count !== 1) {
        throw new ConflictException('Learning needs draft has changed; reload and try again');
      }
    }

    return this.getForBooking(userId, bookingId);
  }

  async share(
    userId: string,
    bookingId: string,
    expectedDraftRevision: number
  ): Promise<LearningNeedsBookingDto> {
    const booking = await this.getOwnedSuccessfulBooking(userId, bookingId);
    const record = booking.learningNeeds;
    if (!record) {
      throw new BadRequestException('Save learning needs before sharing');
    }
    if (record.draftRevision !== expectedDraftRevision) {
      throw new ConflictException('Learning needs draft has changed; reload and try again');
    }

    const answers = record.draftAnswers as unknown as LearningNeedsAnswersV1;
    this.assertShareable(answers);
    if (record.sharedFromDraftRevision === record.draftRevision && record.sharedAt) {
      return this.getForBooking(userId, bookingId);
    }

    const channel = await this.findPairChannel(booking.studentId, booking.tutor.userId);
    const shareResult = await this.prisma.learningNeeds.updateMany({
      where: {
        id: record.id,
        draftRevision: expectedDraftRevision,
        OR: [
          { sharedFromDraftRevision: null },
          { sharedFromDraftRevision: { not: expectedDraftRevision } },
        ],
      },
      data: {
        sharedAnswers: record.draftAnswers as Prisma.InputJsonValue,
        sharedFromDraftRevision: record.draftRevision,
        sharedRevision: { increment: 1 },
        sharedAt: new Date(),
        userDmChannelId: channel?.id ?? record.userDmChannelId,
        syncStatus: channel ? ELearningNeedsSyncStatus.SYNCED : ELearningNeedsSyncStatus.PENDING,
        syncAttempts: 0,
        lastSyncError: null,
        lastSyncAttemptAt: new Date(),
      },
    });
    if (shareResult.count === 0) {
      const latest = await this.prisma.learningNeeds.findUnique({
        where: { id: record.id },
        select: {
          draftRevision: true,
          sharedFromDraftRevision: true,
          sharedAt: true,
        },
      });
      if (
        latest?.draftRevision === expectedDraftRevision &&
        latest.sharedFromDraftRevision === expectedDraftRevision &&
        latest.sharedAt
      ) {
        return this.getForBooking(userId, bookingId);
      }
      throw new ConflictException('Learning needs draft has changed; reload and try again');
    }
    return this.getForBooking(userId, bookingId);
  }

  async getCurrentForChannel(
    userId: string,
    channelId: string
  ): Promise<CurrentLearningNeedsPinDto> {
    const channel = await this.prisma.userDmChannel.findFirst({
      where: {
        channelId,
        OR: [{ senderId: userId }, { recipientId: userId }],
      },
    });
    if (!channel) {
      throw new NotFoundException('Conversation not found');
    }

    const peerId = channel.senderId === userId ? channel.recipientId : channel.senderId;
    // Reconcile records that were shared before the canonical DM mapping was
    // persisted. This is idempotent and makes opening the chat a safe retry.
    await this.prisma.learningNeeds.updateMany({
      where: {
        userDmChannelId: null,
        sharedAt: { not: null },
        OR: [
          { studentId: userId, tutor: { userId: peerId } },
          { studentId: peerId, tutor: { userId } },
        ],
      },
      data: {
        userDmChannelId: channel.id,
        syncStatus: ELearningNeedsSyncStatus.SYNCED,
        lastSyncError: null,
        lastSyncAttemptAt: new Date(),
      },
    });
    const shared = await this.prisma.learningNeeds.findFirst({
      where: {
        userDmChannelId: channel.id,
        syncStatus: ELearningNeedsSyncStatus.SYNCED,
        sharedAt: { not: null },
      },
      include: {
        tutor: {
          select: {
            id: true,
            userId: true,
            firstName: true,
            lastName: true,
            user: { select: { avatar: true } },
          },
        },
      },
      orderBy: { sharedAt: 'desc' },
    });

    if (shared?.sharedAnswers && shared.sharedAt) {
      return {
        state: 'SHARED',
        canEdit: shared.studentId === userId,
        context: this.contextDto(shared, shared.tutor),
        shared: this.sharedDto(shared),
      };
    }

    const eligibleBooking = await this.prisma.trialLessonBooking.findFirst({
      where: {
        paymentStatus: EPaymentStatus.SUCCEEDED,
        OR: [
          { studentId: userId, tutor: { userId: peerId } },
          { studentId: peerId, tutor: { userId } },
        ],
      },
      include: bookingInclude,
      orderBy: { createdAt: 'desc' },
    });
    if (!eligibleBooking) {
      return { state: 'NO_ELIGIBLE_CONTEXT', canEdit: false, context: null, shared: null };
    }

    return {
      state: 'NOT_SHARED',
      canEdit: eligibleBooking.studentId === userId,
      context: this.bookingContextDto(eligibleBooking),
      shared: null,
    };
  }

  async associateChannel(
    userId: string,
    learningNeedsId: string,
    dto: AssociateLearningNeedsChannelDto
  ): Promise<LearningNeedsBookingDto> {
    const record = await this.prisma.learningNeeds.findUnique({
      where: { id: learningNeedsId },
      include: {
        tutor: { select: { userId: true } },
      },
    });
    if (!record || record.studentId !== userId) {
      throw new NotFoundException('Learning needs not found');
    }
    if (!record.sharedAt) {
      throw new BadRequestException('Learning needs must be shared before associating a channel');
    }

    const channel = await this.prisma.userDmChannel.findUnique({
      where: { channelId: dto.channelId },
    });
    if (!channel || !this.isExactPair(channel, record.studentId, record.tutor.userId)) {
      throw new BadRequestException('Conversation does not match this learning context');
    }

    await this.prisma.learningNeeds.update({
      where: { id: record.id },
      data: {
        userDmChannelId: channel.id,
        syncStatus: ELearningNeedsSyncStatus.SYNCED,
        lastSyncError: null,
        lastSyncAttemptAt: new Date(),
      },
    });
    return this.getForBooking(userId, record.trialLessonBookingId);
  }

  async recordSyncFailure(
    userId: string,
    id: string,
    _errorMessage?: string
  ): Promise<{ ok: boolean }> {
    const record = await this.prisma.learningNeeds.findUnique({
      where: { id },
      select: { studentId: true },
    });
    if (!record || record.studentId !== userId) {
      throw new NotFoundException('Learning needs not found');
    }

    await this.prisma.learningNeeds.updateMany({
      where: {
        id,
        studentId: userId,
        userDmChannelId: null,
        sharedAt: { not: null },
      },
      data: {
        syncStatus: ELearningNeedsSyncStatus.FAILED,
        // Never persist client/provider exception strings: they may contain
        // credentials or request data. Keep a stable operational code only.
        lastSyncError: 'MEZON_SYNC_FAILED',
        lastSyncAttemptAt: new Date(),
        syncAttempts: { increment: 1 },
      },
    });
    return { ok: true };
  }

  private async getAuthorizedBooking(userId: string, bookingId: string) {
    const booking = await this.prisma.trialLessonBooking.findUnique({
      where: { id: bookingId },
      include: bookingInclude,
    });
    if (!booking || (booking.studentId !== userId && booking.tutor.userId !== userId)) {
      throw new NotFoundException('Booking not found');
    }
    return booking;
  }

  private async getOwnedSuccessfulBooking(userId: string, bookingId: string) {
    const booking = await this.getAuthorizedBooking(userId, bookingId);
    if (booking.studentId !== userId) {
      throw new NotFoundException('Booking not found');
    }
    if (booking.paymentStatus !== EPaymentStatus.SUCCEEDED) {
      throw new BadRequestException('Learning needs are available after successful payment');
    }
    return booking;
  }

  private normalizeAndValidateAnswers(dto: LearningNeedsAnswersDto): LearningNeedsAnswersV1 {
    const clean = (value: string | null) => value?.trim() || null;
    const industryKnowledgeRequired = dto.industryKnowledgeRequired ?? null;
    const answers: LearningNeedsAnswersV1 = {
      ...dto,
      learningGoal: dto.learningGoal ?? null,
      currentLevel: dto.currentLevel ?? null,
      workContext: clean(dto.workContext),
      industryKnowledgeRequired,
      industryContext: industryKnowledgeRequired === true ? clean(dto.industryContext) : null,
      lessonsPerMonth: dto.lessonsPerMonth ?? null,
      timezone: clean(dto.timezone),
      nativeLanguage: clean(dto.nativeLanguage),
      otherLanguages: Array.from(
        new Set(dto.otherLanguages.map((value) => value.trim()).filter(Boolean))
      ),
    };
    if (answers.timezone) {
      try {
        new Intl.DateTimeFormat('en', { timeZone: answers.timezone }).format();
      } catch {
        throw new BadRequestException('Invalid IANA timezone');
      }
    }
    return answers;
  }

  private assertShareable(answers: LearningNeedsAnswersV1) {
    if (!answers.learningGoal) {
      throw new BadRequestException('Learning goal is required to share');
    }
  }

  private reusableCrossSubjectPreferences(answers: LearningNeedsAnswersV1): LearningNeedsAnswersV1 {
    return {
      ...answers,
      learningGoal: null,
      usageSituations: [],
      focusAreas: [],
      currentLevel: null,
      workContext: null,
      industryKnowledgeRequired: null,
      industryContext: null,
    };
  }

  private async findPairChannel(userAId: string, userBId: string) {
    const [senderId, recipientId] = [userAId, userBId].sort();
    return this.prisma.userDmChannel.findUnique({
      where: { senderId_recipientId: { senderId, recipientId } },
    });
  }

  private isExactPair(
    channel: { senderId: string; recipientId: string },
    userAId: string,
    userBId: string
  ) {
    return (
      new Set([channel.senderId, channel.recipientId]).size === 2 &&
      channel.senderId !== channel.recipientId &&
      [channel.senderId, channel.recipientId].every((id) => id === userAId || id === userBId)
    );
  }

  private toBookingDto(
    booking: BookingWithContext,
    userId: string,
    previousAnswers?: LearningNeedsAnswersV1 | null
  ): LearningNeedsBookingDto {
    const record = booking.learningNeeds;
    const canEdit = booking.studentId === userId;
    return {
      context: this.bookingContextDto(booking),
      draft:
        canEdit && record
          ? {
              revision: record.draftRevision,
              answers: record.draftAnswers as unknown as LearningNeedsAnswersV1,
              updatedAt: record.updatedAt.toISOString(),
            }
          : null,
      prefill: canEdit && !record ? (previousAnswers ?? null) : null,
      shared: record?.sharedAnswers && record.sharedAt ? this.sharedDto(record) : null,
      sync: this.syncDto(record),
      canEdit,
      channelId: record?.userDmChannel?.channelId ?? null,
      chatPeer: canEdit
        ? {
            userId: booking.tutor.userId,
            mezonUserId: booking.tutor.user.mezonUserId,
          }
        : {
            userId: booking.studentId,
            mezonUserId: booking.student.mezonUserId,
          },
    };
  }

  private syncDto(
    record: {
      syncStatus: ELearningNeedsSyncStatus;
      syncAttempts: number;
      lastSyncError: string | null;
      lastSyncAttemptAt: Date | null;
    } | null
  ): LearningNeedsSyncDto {
    if (!record) {
      return {
        status: 'NOT_REQUIRED',
        attempts: 0,
        lastAttemptAt: null,
        lastError: null,
      };
    }

    return {
      status: record.syncStatus,
      attempts: record.syncAttempts,
      lastAttemptAt: record.lastSyncAttemptAt?.toISOString() ?? null,
      // Never expose provider credentials, request payloads or raw gateway errors.
      lastError: record.syncStatus === ELearningNeedsSyncStatus.FAILED ? 'MEZON_SYNC_FAILED' : null,
    };
  }

  private bookingContextDto(booking: BookingWithContext): LearningNeedsContextDto {
    return {
      id: booking.learningNeeds?.id ?? booking.id,
      bookingId: booking.id,
      subject:
        booking.learningNeeds?.subjectSnapshot ?? (booking.tutor.subject.trim() || 'General'),
      tutor: {
        id: booking.tutor.id,
        displayName: this.tutorName(booking.tutor),
        avatarUrl: booking.tutor.user.avatar,
      },
    };
  }

  private contextDto(
    record: { id: string; trialLessonBookingId: string; subjectSnapshot: string },
    tutor: { id: string; firstName: string; lastName: string; user: { avatar: string } }
  ): LearningNeedsContextDto {
    return {
      id: record.id,
      bookingId: record.trialLessonBookingId,
      subject: record.subjectSnapshot,
      tutor: {
        id: tutor.id,
        displayName: this.tutorName(tutor),
        avatarUrl: tutor.user.avatar,
      },
    };
  }

  private sharedDto(record: {
    sharedRevision: number;
    sharedAnswers: Prisma.JsonValue | null;
    sharedAt: Date | null;
    subjectSnapshot: string;
  }): LearningNeedsSharedSnapshotDto {
    const answers = record.sharedAnswers as unknown as LearningNeedsAnswersV1;
    const sharedAt = record.sharedAt as Date;
    return {
      revision: record.sharedRevision,
      answers,
      sharedAt: sharedAt.toISOString(),
      updatedAt: sharedAt.toISOString(),
      shortSummary: answers.learningGoal
        ? `${record.subjectSnapshot} · ${answers.learningGoal.replaceAll('_', ' ').toLowerCase()}`
        : record.subjectSnapshot,
    };
  }

  private tutorName(tutor: { firstName: string; lastName: string }) {
    return `${tutor.firstName} ${tutor.lastName}`.trim() || tutor.firstName;
  }
}
