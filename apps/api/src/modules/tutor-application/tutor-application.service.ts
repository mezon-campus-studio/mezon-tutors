import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ENotificationType, Role, TutorProfile, VerificationStatus } from '@mezon-tutors/db';
import { ChannelMessageContent } from 'mezon-sdk';
import {
  AdminLessonChangeHistoryItem,
  FullTutorApplication,
  TutorAdminNote,
  TutorApplicationMetrics,
} from '@mezon-tutors/shared';
import { calculateAverageDurationHours } from '../../common/utils/time.util';
import { CreateAdminNoteDto } from './dto/create-admin-note.dto';
import { EmailService } from '../../shared/services/email.service';
import { MezonMessageService } from '../../shared/services/mezon-message';
import { ContentReviewer } from '../../shared/types';
import { MezonBotService } from '../mezon-bot/mezon-bot.service';
import { NotificationService } from '../notification/notification.service';
import { TutorApplicationMapper, TutorProfileWithUser } from './tutor-application.mapper';

@Injectable()
export class TutorApplicationService {
  private readonly logger = new Logger(TutorApplicationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly mapper: TutorApplicationMapper,
    private readonly notificationService: NotificationService,
    private readonly mezonMessageService: MezonMessageService,
    private readonly mezonBotService: MezonBotService
  ) {}

  private buildRejectionSummary(notes: ContentReviewer[]): string {
    if (!notes.length) {
      return 'Please review our feedback and update your application before reapplying.';
    }
    return notes
      .map((note) => note.content.trim())
      .filter(Boolean)
      .join('\n')
      .slice(0, 500);
  }

  private async notifyTutorApplicationDecision(params: {
    userId: string;
    mezonUserId: string | null | undefined;
    tutorProfileId: string;
    dedupeKey: string;
    title: string;
    content: string;
    mezonMessage: ChannelMessageContent;
  }): Promise<void> {
    try {
      await this.notificationService.createForUser(params.userId, {
        title: params.title,
        content: params.content,
        type: ENotificationType.SYSTEM,
        dedupeKey: params.dedupeKey,
        metadata: { tutorProfileId: params.tutorProfileId },
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to create in-app notification (${params.dedupeKey}): ${detail}`
      );
    }

    const mezonUserId = params.mezonUserId?.trim();
    if (!mezonUserId) {
      return;
    }
    if (!this.mezonBotService.isConfigured()) {
      this.logger.warn('Mezon bot is not configured; skipping tutor application DM');
      return;
    }

    try {
      await this.mezonBotService.sendDMToUser(mezonUserId, params.mezonMessage);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to send Mezon DM (${params.dedupeKey}): ${detail}`);
    }
  }

  async getTutorProfile(id: string): Promise<FullTutorApplication> {
    const [profile, notes, documents, verification, availability] = await Promise.all([
      this.prisma.tutorProfile.findFirst({
        where: { id },
        include: { user: true, languages: true, trialLessonPrice: true },
      }),
      this.prisma.tutorAdminNote.findMany({
        where: { tutorId: id },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.professionalDocument.findMany({
        where: { tutorId: id },
      }),
      this.prisma.identityVerification.findUnique({
        where: { tutorId: id },
      }),
      this.prisma.tutorAvailability.findMany({
        where: { tutorId: id },
      }),
    ]);

    if (!profile) {
      throw new NotFoundException(`Tutor profile with ID ${id} not found`);
    }

    return this.mapper.mapFullTutorApplication(
      profile as TutorProfileWithUser,
      notes,
      documents,
      verification,
      availability
    );
  }

  async createAdminNote(payload: CreateAdminNoteDto): Promise<TutorAdminNote> {
    const note = await this.prisma.tutorAdminNote.create({
      data: {
        tutorId: payload.tutorId,
        reviewerId: payload.reviewerId,
        reviewerName: payload.reviewerName,
        content: payload.content,
      },
    });

    return note;
  }

  async getLessonChangeHistory(tutorId: string): Promise<AdminLessonChangeHistoryItem[]> {
    const profile = await this.prisma.tutorProfile.findUnique({
      where: { id: tutorId },
      select: { id: true },
    });

    if (!profile) {
      throw new NotFoundException(`Tutor profile with ID ${tutorId} not found`);
    }

    const rows = await this.prisma.cancelRescheduleReason.findMany({
      where: { tutorId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        student: { select: { id: true, username: true, email: true } },
        initiatedBy: { select: { username: true } },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      studentId: row.studentId,
      studentName: row.student.username,
      studentEmail: row.student.email,
      action: row.action,
      lessonType: row.lessonType,
      initiatedByRole: row.initiatedByRole,
      initiatedByName: row.initiatedBy.username,
      reason: row.reason,
      message: row.message,
      originalStartAt: row.originalStartAt.toISOString(),
      originalDurationMinutes: row.originalDurationMinutes,
      trialLessonBookingId: row.trialLessonBookingId,
      subscriptionEnrollmentId: row.subscriptionEnrollmentId,
      subscriptionSlotIndex: row.subscriptionSlotIndex,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async listApplications(): Promise<TutorProfile[]> {
    const profiles = await this.prisma.tutorProfile.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
    return profiles;
  }

  async approve(id: string, emailNote?: string): Promise<{ success: boolean }> {
    const profile = await this.prisma.tutorProfile.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        user: {
          select: { email: true, username: true, mezonUserId: true },
        },
      },
    });
    if (!profile) {
      throw new NotFoundException(`Tutor application not found: ${id}`);
    }
    await this.prisma.$transaction([
      this.prisma.tutorProfile.update({
        where: { id },
        data: {
          verificationStatus: VerificationStatus.APPROVED,
        },
      }),
      this.prisma.user.update({
        where: { id: profile.userId },
        data: { role: Role.TUTOR },
      }),
    ]);

    const tutorName = profile.user?.username ?? 'there';

    if (profile.user?.email) {
      await this.emailService.sendApprovalEmail(
        profile.user.email,
        tutorName,
        emailNote?.trim() || undefined,
      );
    }

    await this.notifyTutorApplicationDecision({
      userId: profile.userId,
      mezonUserId: profile.user?.mezonUserId,
      tutorProfileId: profile.id,
      dedupeKey: `tutor-application-approved:${profile.id}`,
      title: 'Tutor application approved',
      content: `Hi ${tutorName}, your tutor profile has been approved. You can set up your profile and start accepting students.`,
      mezonMessage: this.mezonMessageService.tutorApplicationApproved(tutorName),
    });

    return { success: true };
  }

  async reject(id: string, emailNote?: string): Promise<{ success: boolean }> {
    const profile = await this.prisma.tutorProfile.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        email: true,
        user: {
          select: { email: true, username: true, mezonUserId: true },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException(`Tutor application not found: ${id}`);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.tutorProfile.update({
        where: { id },
        data: {
          verificationStatus: VerificationStatus.REJECTED,
        },
      });
      const user = await tx.user.findUnique({
        where: { id: profile.userId },
        select: { role: true },
      });
      if (user?.role === Role.TUTOR) {
        await tx.user.update({
          where: { id: profile.userId },
          data: { role: Role.STUDENT },
        });
      }
    });

    const reviewerNotes: ContentReviewer[] = await this.prisma.tutorAdminNote.findMany({
      where: { tutorId: profile.id },
      select: { content: true },
    });

    const tutorName = profile.user?.username ?? 'there';
    const rejectionSummary = this.buildRejectionSummary(reviewerNotes);

    if (profile.email) {
      await this.emailService.sendRejectionEmail(
        profile.email,
        tutorName,
        reviewerNotes,
        null,
        emailNote?.trim() || undefined,
      );
    }

    await this.notifyTutorApplicationDecision({
      userId: profile.userId,
      mezonUserId: profile.user?.mezonUserId,
      tutorProfileId: profile.id,
      dedupeKey: `tutor-application-rejected:${profile.id}`,
      title: 'Tutor application rejected',
      content: `Hi ${tutorName}, we could not approve your tutor application at this time. ${rejectionSummary}`,
      mezonMessage: this.mezonMessageService.tutorApplicationRejected({
        tutorName,
        summary: rejectionSummary,
      }),
    });

    return { success: true };
  }

  async getMetrics(): Promise<TutorApplicationMetrics> {
    const now = new Date();

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const startOf7DaysAgo = new Date(startOfToday);
    startOf7DaysAgo.setDate(startOfToday.getDate() - 7);

    const startOf14DaysAgo = new Date(startOfToday);
    startOf14DaysAgo.setDate(startOfToday.getDate() - 14);

    const [
      totalPending,
      pendingLastWeek,
      approvedToday,
      approvedLast7Days,
      approvedPrevious7Days,
      last10Reviewed,
      previous10Reviewed,
    ] = await Promise.all([
      this.prisma.tutorProfile.count({
        where: { verificationStatus: VerificationStatus.PENDING },
      }),

      this.prisma.tutorProfile.count({
        where: {
          verificationStatus: VerificationStatus.PENDING,
          createdAt: { lt: startOf7DaysAgo },
        },
      }),

      this.prisma.tutorProfile.count({
        where: {
          verificationStatus: VerificationStatus.APPROVED,
          updatedAt: { gte: startOfToday },
        },
      }),

      this.prisma.tutorProfile.count({
        where: {
          verificationStatus: VerificationStatus.APPROVED,
          updatedAt: { gte: startOf7DaysAgo },
        },
      }),

      this.prisma.tutorProfile.count({
        where: {
          verificationStatus: VerificationStatus.APPROVED,
          updatedAt: { gte: startOf14DaysAgo, lt: startOf7DaysAgo },
        },
      }),

      this.prisma.tutorProfile.findMany({
        where: {
          verificationStatus: {
            in: [VerificationStatus.APPROVED, VerificationStatus.REJECTED],
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
        take: 10,
        select: {
          createdAt: true,
          updatedAt: true,
        },
      }),

      this.prisma.tutorProfile.findMany({
        where: {
          verificationStatus: {
            in: [VerificationStatus.APPROVED, VerificationStatus.REJECTED],
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
        skip: 10,
        take: 10,
        select: {
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    const avgReviewTimeLast10 = calculateAverageDurationHours(last10Reviewed);
    const avgReviewTimePrevious10 = calculateAverageDurationHours(previous10Reviewed);

    const approvedChangePercent =
      approvedPrevious7Days > 0
        ? Math.round(((approvedLast7Days - approvedPrevious7Days) / approvedPrevious7Days) * 100)
        : approvedLast7Days > 0
          ? 100
          : 0;

    const avgReviewTimeChangePercent =
      avgReviewTimePrevious10 > 0
        ? Math.round(
            ((avgReviewTimeLast10 - avgReviewTimePrevious10) / avgReviewTimePrevious10) * 100
          )
        : 0;

    const totalPendingChangePercent =
      pendingLastWeek > 0
        ? Math.round(((totalPending - pendingLastWeek) / pendingLastWeek) * 100)
        : totalPending > 0
          ? 100
          : 0;

    return {
      total_pending: totalPending,
      approved_today: approvedToday,
      avg_review_time_hours: Math.round(avgReviewTimeLast10 * 10) / 10,

      total_pending_change_percent: totalPendingChangePercent,
      approved_today_change_percent: approvedChangePercent,
      avg_review_time_change_percent: avgReviewTimeChangePercent,
    };
  }
}
