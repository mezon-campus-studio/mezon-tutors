import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  ELessonChangeLessonType,
  ELessonComplaintStatus,
  ECurrency,
  EPaymentStatus,
  ETrialLessonStatus,
  Prisma,
  Role,
} from '@mezon-tutors/db';
import {
  type StudentLessonComplaintItem,
  type AdminLessonComplaintListItem,
  type AdminLessonComplaintMetrics,
  type TutorLessonComplaintListItem,
  type TutorConfirmLessonComplaintResult,
  type LessonComplaintCreatedResult,
  type ReviewLessonComplaintResult,
  type RequestTutorLessonComplaintReviewResult,
  ELessonComplaintStatus as LessonComplaintStatusApi,
  ESubscriptionLessonSlotStatus,
  isLessonFinishedForComplaint,
  isSubscriptionSlotCompleted,
  isWithinLessonComplaintWindow,
  normalizeSubscriptionSlotStatus,
  subscriptionConcreteOccurrencesSorted,
  subscriptionSlotGrossAmount,
  subscriptionSlotTutorAmount,
  type LessonComplaintStatusFilter,
  type SubscriptionWeeklySlotDto,
} from '@mezon-tutors/shared';
import dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { WalletService } from '../wallet/wallet.service';
import { AppSettingsService } from '../app-settings/app-settings.service';
import type { CreateLessonComplaintDto } from './dto/create-lesson-complaint.dto';
import type { ReviewLessonComplaintDto } from './dto/review-lesson-complaint.dto';
import {
  parseLessonComplaintAttachments,
  serializeLessonComplaintAttachments,
} from './lesson-complaint-attachments.util';

dayjs.extend(utc);
dayjs.extend(timezone);

type StudentComplaintNotificationDetails = {
  tutorName: string;
  lessonStartAtLabel: string;
  lessonStartAtIso: string;
  submittedAtLabel: string;
  amount: bigint;
  tutorAmount: bigint;
  currency?: ECurrency;
};

type ComplaintLessonContext = {
  tutorId: string;
  lessonStartAt: Date;
  lessonDurationMinutes: number;
  trialLessonBookingId?: string;
  subscriptionEnrollmentId?: string;
  subscriptionSlotIndex?: number;
  grossAmount?: bigint;
  tutorUserId?: string;
  tutorAmount?: bigint;
  slotCount?: number;
};

type ComplaintWithNotificationContext = {
  studentId: string;
  reason: string;
  message: string | null;
  createdAt: Date;
  lessonStartAt: Date;
  subscriptionSlotIndex: number | null;
  lessonType: ELessonChangeLessonType;
  trialLessonBooking: {
    grossAmount: bigint;
    tutorAmount: bigint;
    currency: string | null;
    tutor: { user: { username: string; timezone: string | null } };
  } | null;
  subscriptionEnrollment: {
    grossAmount: bigint;
    tutorAmount: bigint;
    currency: string | null;
    weeklySlots: Prisma.JsonValue;
    tutor: { user: { username: string; timezone: string | null } };
  } | null;
};

@Injectable()
export class LessonComplaintService {
  private readonly logger = new Logger(LessonComplaintService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly notificationService: NotificationService,
    private readonly appSettingsService: AppSettingsService
  ) {}

  async createComplaint(
    studentUserId: string,
    dto: CreateLessonComplaintDto
  ): Promise<LessonComplaintCreatedResult> {
    const student = await this.prisma.user.findUnique({
      where: { id: studentUserId },
      select: { id: true, role: true, username: true, avatar: true },
    });
    if (!student || student.role !== Role.STUDENT) {
      throw new ForbiddenException('Only students can submit lesson complaints');
    }

    const context = await this.resolveLessonContext(studentUserId, dto);
    const now = new Date();
    const settings = await this.appSettingsService.getSettings();

    if (!isLessonFinishedForComplaint(context.lessonStartAt, context.lessonDurationMinutes, now)) {
      throw new BadRequestException('Complaints are only allowed after the lesson has ended');
    }
    if (
      !isWithinLessonComplaintWindow(
        context.lessonStartAt,
        context.lessonDurationMinutes,
        now,
        settings.disputePeriodHours
      )
    ) {
      throw new BadRequestException('The complaint window for this lesson has expired');
    }

    const complaint = await this.prisma.lessonComplaint.create({
      data: {
        studentId: studentUserId,
        tutorId: context.tutorId,
        lessonType: dto.lessonType,
        reason: dto.reason.trim(),
        message: dto.message?.trim() || null,
        trialLessonBookingId: context.trialLessonBookingId ?? null,
        subscriptionEnrollmentId: context.subscriptionEnrollmentId ?? null,
        subscriptionSlotIndex: context.subscriptionSlotIndex ?? null,
        lessonStartAt: context.lessonStartAt,
        lessonDurationMinutes: context.lessonDurationMinutes,
        attachmentUrls: serializeLessonComplaintAttachments(dto.attachments),
      },
      select: {
        id: true,
        status: true,
        lessonStartAt: true,
        reason: true,
        message: true,
        tutor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            user: { select: { username: true } },
          },
        },
      },
    });

    try {
      const tutorName =
        `${complaint.tutor.firstName ?? ''} ${complaint.tutor.lastName ?? ''}`.trim() ||
        complaint.tutor.user.username ||
        'Tutor';
      const lessonStartAtLabel = dayjs(complaint.lessonStartAt)
        .utc()
        .format('ddd, D MMM YYYY · HH:mm [UTC]');

      await this.notificationService.notifyAdminLessonComplaintSubmitted({
        complaintId: complaint.id,
        studentName: student.username || 'Student',
        tutorName,
        lessonStartAtLabel,
        reason: complaint.reason,
        message: complaint.message,
        senderAvatarUrl: student.avatar,
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to notify for complaint ${complaint.id}: ${detail}`);
    }

    return {
      id: complaint.id,
      status: complaint.status as LessonComplaintStatusApi,
    };
  }

  async listMine(studentUserId: string): Promise<StudentLessonComplaintItem[]> {
    const rows = await this.prisma.lessonComplaint.findMany({
      where: { studentId: studentUserId },
      orderBy: { createdAt: 'desc' },
      include: {
        tutor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            subject: true,
            avatar: true,
          },
        },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      status: row.status as LessonComplaintStatusApi,
      lesson_type: row.lessonType,
      reason: row.reason,
      message: row.message,
      attachment_urls: parseLessonComplaintAttachments(row.attachmentUrls),
      lesson_start_at: row.lessonStartAt.toISOString(),
      lesson_duration_minutes: row.lessonDurationMinutes,
      created_at: row.createdAt.toISOString(),
      admin_note: row.adminNote,
      tutor_note: row.tutorNote,
      reviewed_at: row.reviewedAt?.toISOString() ?? null,
      tutor: {
        id: row.tutor.id,
        first_name: row.tutor.firstName,
        last_name: row.tutor.lastName,
        subject: row.tutor.subject,
        avatar: row.tutor.avatar,
      },
    }));
  }

  async listForAdmin(
    statusFilter?: LessonComplaintStatusFilter
  ): Promise<AdminLessonComplaintListItem[]> {
    const where: Prisma.LessonComplaintWhereInput =
      statusFilter && statusFilter !== 'all' ? { status: statusFilter } : {};

    const rows = await this.prisma.lessonComplaint.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        student: { select: { id: true, username: true, email: true, avatar: true } },
        tutor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            subject: true,
            avatar: true,
          },
        },
        trialLessonBooking: { select: { grossAmount: true, currency: true } },
        subscriptionEnrollment: {
          select: { grossAmount: true, currency: true, weeklySlots: true },
        },
      },
    });

    return rows.map((row) => {
      let grossAmount: number | null = null;
      let currency: string | null = null;

      if (row.trialLessonBooking) {
        grossAmount = Number(row.trialLessonBooking.grossAmount);
        currency = row.trialLessonBooking.currency;
      } else if (row.subscriptionEnrollment && row.subscriptionSlotIndex != null) {
        const slots = this.parseWeeklySlots(row.subscriptionEnrollment.weeklySlots);
        const slotGross = subscriptionSlotGrossAmount(
          row.subscriptionEnrollment.grossAmount,
          slots.length || 1,
          row.subscriptionSlotIndex
        );
        grossAmount = Number(slotGross);
        currency = row.subscriptionEnrollment.currency;
      }

      return {
        id: row.id,
        status: row.status as LessonComplaintStatusApi,
        lesson_type: row.lessonType,
        reason: row.reason,
        message: row.message,
        attachment_urls: parseLessonComplaintAttachments(row.attachmentUrls),
        lesson_start_at: row.lessonStartAt.toISOString(),
        lesson_duration_minutes: row.lessonDurationMinutes,
        created_at: row.createdAt.toISOString(),
        student: {
          id: row.student.id,
          username: row.student.username,
          email: row.student.email,
          avatar: row.student.avatar,
        },
        tutor: {
          id: row.tutor.id,
          first_name: row.tutor.firstName,
          last_name: row.tutor.lastName,
          subject: row.tutor.subject,
          avatar: row.tutor.avatar,
        },
        trial_lesson_booking_id: row.trialLessonBookingId,
        subscription_enrollment_id: row.subscriptionEnrollmentId,
        subscription_slot_index: row.subscriptionSlotIndex,
        gross_amount: grossAmount,
        currency,
        admin_note: row.adminNote,
        tutor_note: row.tutorNote,
        reviewed_at: row.reviewedAt?.toISOString() ?? null,
      };
    });
  }

  async requestTutorReview(
    _adminUserId: string,
    complaintId: string
  ): Promise<RequestTutorLessonComplaintReviewResult> {
    const complaint = await this.prisma.lessonComplaint.findUnique({
      where: { id: complaintId },
      include: {
        student: { select: { username: true, avatar: true } },
        tutor: {
          select: {
            userId: true,
            user: { select: { mezonUserId: true } },
          },
        },
      },
    });
    if (!complaint) {
      throw new NotFoundException('Complaint not found');
    }
    if (complaint.status !== ELessonComplaintStatus.PENDING) {
      throw new BadRequestException('Only pending complaints can be sent to the tutor');
    }

    const updated = await this.prisma.lessonComplaint.update({
      where: { id: complaintId },
      data: { status: ELessonComplaintStatus.TUTOR_REVIEW_REQUESTED },
      select: { id: true, status: true, lessonStartAt: true, reason: true, message: true },
    });

    try {
      const lessonStartAtLabel = dayjs(updated.lessonStartAt)
        .utc()
        .format('ddd, D MMM YYYY · HH:mm [UTC]');
      await this.notificationService.notifyTutorLessonComplaintSubmitted({
        complaintId: updated.id,
        tutorUserId: complaint.tutor.userId,
        tutorMezonUserId: complaint.tutor.user.mezonUserId,
        studentName: complaint.student.username || 'Student',
        lessonStartAtLabel,
        reason: updated.reason,
        message: updated.message,
        senderAvatarUrl: complaint.student.avatar,
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to notify tutor for complaint review request ${updated.id}: ${detail}`
      );
    }

    return {
      id: updated.id,
      status: updated.status as LessonComplaintStatusApi,
    };
  }

  async listForTutor(tutorUserId: string): Promise<TutorLessonComplaintListItem[]> {
    await this.assertTutorUser(tutorUserId);
    const tutor = await this.prisma.tutorProfile.findUnique({
      where: { userId: tutorUserId },
      select: { id: true },
    });
    if (!tutor) {
      throw new NotFoundException('Tutor profile not found');
    }

    const rows = await this.prisma.lessonComplaint.findMany({
      where: {
        tutorId: tutor.id,
        status: {
          in: [
            ELessonComplaintStatus.TUTOR_REVIEW_REQUESTED,
            ELessonComplaintStatus.TUTOR_CONFIRMED,
            ELessonComplaintStatus.TUTOR_REJECTED,
            ELessonComplaintStatus.APPROVED,
          ],
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        student: {
          select: { id: true, username: true, avatar: true },
        },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      status: row.status as LessonComplaintStatusApi,
      lesson_type: row.lessonType,
      reason: row.reason,
      message: row.message,
      attachment_urls: parseLessonComplaintAttachments(row.attachmentUrls),
      lesson_start_at: row.lessonStartAt.toISOString(),
      lesson_duration_minutes: row.lessonDurationMinutes,
      created_at: row.createdAt.toISOString(),
      student: {
        id: row.student.id,
        username: row.student.username,
        avatar: row.student.avatar,
      },
      trial_lesson_booking_id: row.trialLessonBookingId,
      subscription_enrollment_id: row.subscriptionEnrollmentId,
      subscription_slot_index: row.subscriptionSlotIndex,
      tutor_note: row.tutorNote,
    }));
  }

  async confirmComplaintByTutor(
    tutorUserId: string,
    complaintId: string
  ): Promise<TutorConfirmLessonComplaintResult> {
    await this.assertTutorUser(tutorUserId);
    const tutor = await this.prisma.tutorProfile.findUnique({
      where: { userId: tutorUserId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        user: { select: { username: true } },
      },
    });
    if (!tutor) {
      throw new NotFoundException('Tutor profile not found');
    }

    const complaint = await this.prisma.lessonComplaint.findUnique({
      where: { id: complaintId },
      include: {
        student: { select: { username: true } },
      },
    });
    if (!complaint) {
      throw new NotFoundException('Complaint not found');
    }
    if (complaint.tutorId !== tutor.id) {
      throw new ForbiddenException('Not allowed to confirm this complaint');
    }
    if (complaint.status !== ELessonComplaintStatus.TUTOR_REVIEW_REQUESTED) {
      throw new BadRequestException('This complaint cannot be confirmed');
    }

    const updated = await this.prisma.lessonComplaint.update({
      where: { id: complaintId },
      data: { status: ELessonComplaintStatus.TUTOR_CONFIRMED },
      select: { id: true, status: true, reason: true, lessonStartAt: true },
    });

    try {
      const tutorDisplay =
        `${tutor.firstName ?? ''} ${tutor.lastName ?? ''}`.trim() ||
        tutor.user.username ||
        'Tutor';

      await this.notificationService.notifyAdminLessonComplaintTutorConfirmed({
        complaintId: updated.id,
        studentName: complaint.student.username || 'Student',
        tutorName: tutorDisplay,
        lessonStartAtLabel: dayjs(updated.lessonStartAt)
          .utc()
          .format('ddd, D MMM YYYY · HH:mm [UTC]'),
        reason: updated.reason,
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to notify admin for tutor-confirmed complaint ${updated.id}: ${detail}`
      );
    }

    return {
      id: updated.id,
      status: updated.status as LessonComplaintStatusApi,
    };
  }

  async rejectComplaintByTutor(
    tutorUserId: string,
    complaintId: string,
    dto: { tutorNote?: string }
  ): Promise<{ id: string; status: LessonComplaintStatusApi }> {
    await this.assertTutorUser(tutorUserId);
    const tutor = await this.prisma.tutorProfile.findUnique({
      where: { userId: tutorUserId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        user: { select: { username: true } },
      },
    });
    if (!tutor) {
      throw new NotFoundException('Tutor profile not found');
    }

    const complaint = await this.prisma.lessonComplaint.findUnique({
      where: { id: complaintId },
      include: {
        student: { select: { id: true, username: true, mezonUserId: true } },
      },
    });
    if (!complaint) {
      throw new NotFoundException('Complaint not found');
    }
    if (complaint.tutorId !== tutor.id) {
      throw new ForbiddenException('Not allowed to reject this complaint');
    }
    if (complaint.status !== ELessonComplaintStatus.TUTOR_REVIEW_REQUESTED) {
      throw new BadRequestException('This complaint cannot be rejected');
    }

    const tutorNote = dto.tutorNote?.trim() || null;
    const updated = await this.prisma.lessonComplaint.update({
      where: { id: complaintId },
      data: {
        status: ELessonComplaintStatus.TUTOR_REJECTED,
        tutorNote,
      },
      select: { id: true, status: true, reason: true, lessonStartAt: true, createdAt: true },
    });

    const tutorDisplay =
      `${tutor.firstName ?? ''} ${tutor.lastName ?? ''}`.trim() ||
      tutor.user.username ||
      'Tutor';
    const lessonStartAtLabel = dayjs(updated.lessonStartAt)
      .utc()
      .format('ddd, D MMM YYYY · HH:mm [UTC]');
    const submittedAtLabel = dayjs(updated.createdAt)
      .utc()
      .format('ddd, D MMM YYYY · HH:mm [UTC]');

    try {
      await this.notificationService.notifyStudentLessonComplaintTutorRejected({
        studentUserId: complaint.student.id,
        studentMezonUserId: complaint.student.mezonUserId,
        tutorName: tutorDisplay,
        lessonStartAtLabel,
        lessonStartAtIso: updated.lessonStartAt.toISOString(),
        submittedAtLabel,
        reason: updated.reason,
        tutorNote,
        complaintId: updated.id,
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to notify student for tutor-rejected complaint ${updated.id}: ${detail}`
      );
    }

    try {
      await this.notificationService.notifyAdminLessonComplaintTutorRejected({
        complaintId: updated.id,
        studentName: complaint.student.username || 'Student',
        tutorName: tutorDisplay,
        lessonStartAtLabel,
        reason: updated.reason,
        tutorNote,
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to notify admin for tutor-rejected complaint ${updated.id}: ${detail}`
      );
    }

    return {
      id: updated.id,
      status: updated.status as LessonComplaintStatusApi,
    };
  }

  async getAdminMetrics(): Promise<AdminLessonComplaintMetrics> {
    const startOfWeek = dayjs().utc().startOf('week').toDate();

    const [totalRequests, totalThisWeek, totalApproved] = await Promise.all([
      this.prisma.lessonComplaint.count(),
      this.prisma.lessonComplaint.count({
        where: { createdAt: { gte: startOfWeek } },
      }),
      this.prisma.lessonComplaint.count({
        where: { status: ELessonComplaintStatus.APPROVED },
      }),
    ]);

    return {
      total_requests: totalRequests,
      total_this_week: totalThisWeek,
      total_approved: totalApproved,
    };
  }

  async approveComplaint(
    adminUserId: string,
    complaintId: string,
    dto: ReviewLessonComplaintDto
  ): Promise<ReviewLessonComplaintResult> {
    return this.reviewComplaint(adminUserId, complaintId, ELessonComplaintStatus.APPROVED, dto);
  }

  async rejectComplaint(
    adminUserId: string,
    complaintId: string,
    dto: ReviewLessonComplaintDto
  ): Promise<ReviewLessonComplaintResult> {
    return this.reviewComplaint(adminUserId, complaintId, ELessonComplaintStatus.REJECTED, dto);
  }

  private async reviewComplaint(
    adminUserId: string,
    complaintId: string,
    targetStatus: 'APPROVED' | 'REJECTED',
    dto: ReviewLessonComplaintDto
  ): Promise<ReviewLessonComplaintResult> {
    const complaint = await this.prisma.lessonComplaint.findUnique({
      where: { id: complaintId },
      include: {
        trialLessonBooking: {
          select: {
            id: true,
            paymentStatus: true,
            grossAmount: true,
            tutorAmount: true,
            currency: true,
            tutor: { select: { user: { select: { username: true, timezone: true } } } },
          },
        },
        subscriptionEnrollment: {
          select: {
            id: true,
            studentId: true,
            grossAmount: true,
            tutorAmount: true,
            currency: true,
            weeklySlots: true,
            paymentStatus: true,
            tutor: { select: { userId: true, user: { select: { username: true, timezone: true } } } },
          },
        },
      },
    });

    if (!complaint) {
      throw new NotFoundException('Complaint not found');
    }
    if (
      complaint.status === ELessonComplaintStatus.APPROVED ||
      complaint.status === ELessonComplaintStatus.REJECTED
    ) {
      throw new BadRequestException('This complaint has already been reviewed');
    }

    let refunded = false;

    if (targetStatus === 'APPROVED') {
      if (
        (complaint.status === ELessonComplaintStatus.PENDING ||
          complaint.status === ELessonComplaintStatus.TUTOR_REVIEW_REQUESTED) &&
        !dto.acknowledgeWithoutTutorConfirmation
      ) {
        throw new BadRequestException(
          'Tutor has not confirmed this complaint yet. Confirm override to approve without tutor confirmation.'
        );
      }
      if (
        complaint.lessonType === ELessonChangeLessonType.TRIAL &&
        complaint.trialLessonBookingId
      ) {
        const booking = complaint.trialLessonBooking;
        if (!booking || booking.paymentStatus === EPaymentStatus.REFUNDED) {
          throw new BadRequestException('This lesson has already been refunded');
        }
        refunded = await this.walletService.refundTrialLessonBooking(
          complaint.trialLessonBookingId,
          {
            refundDescription: 'Refund approved for lesson complaint',
          }
        );
      } else if (
        complaint.lessonType === ELessonChangeLessonType.SUBSCRIPTION &&
        complaint.subscriptionEnrollmentId != null &&
        complaint.subscriptionSlotIndex != null &&
        complaint.subscriptionEnrollment
      ) {
        const enrollment = complaint.subscriptionEnrollment;
        const slots = this.parseWeeklySlots(enrollment.weeklySlots);
        const tutorLabel = enrollment.tutor.user?.username ?? 'tutor';
        refunded = await this.walletService.refundSubscriptionLessonSlot({
          enrollmentId: enrollment.id,
          slotIndex: complaint.subscriptionSlotIndex,
          studentUserId: complaint.studentId,
          tutorUserId: enrollment.tutor.userId,
          grossAmount: enrollment.grossAmount,
          tutorAmount: enrollment.tutorAmount,
          slotCount: slots.length,
          description: `Refund approved for subscription lesson complaint with ${tutorLabel}`,
        });
      }
    }

    const updated = await this.prisma.lessonComplaint.update({
      where: { id: complaintId },
      data: {
        status: targetStatus,
        reviewedByUserId: adminUserId,
        reviewedAt: new Date(),
        adminNote: dto.adminNote?.trim() || null,
      },
      select: {
        id: true,
        status: true,
        lessonType: true,
        studentId: true,
        tutorId: true,
        subscriptionEnrollmentId: true,
        subscriptionSlotIndex: true,
      },
    });

    try {
      const adminNote = dto.adminNote?.trim() || null;
      const notificationDetails = this.resolveStudentComplaintNotificationDetails(complaint);
      const student = await this.prisma.user.findUnique({
        where: { id: complaint.studentId },
        select: { mezonUserId: true },
      });

      if (targetStatus === 'APPROVED') {
        await this.notificationService.notifyStudentLessonComplaintApproved({
          studentUserId: complaint.studentId,
          studentMezonUserId: student?.mezonUserId,
          tutorName: notificationDetails.tutorName,
          lessonStartAtLabel: notificationDetails.lessonStartAtLabel,
          lessonStartAtIso: notificationDetails.lessonStartAtIso,
          submittedAtLabel: notificationDetails.submittedAtLabel,
          reason: complaint.reason,
          refunded,
          amount: notificationDetails.amount,
          currency: notificationDetails.currency,
          complaintId: updated.id,
        });

        if (refunded) {
          await this.notifyTutorOnApprovedRefund(complaint, updated, notificationDetails);
        }
      } else if (complaint.status !== ELessonComplaintStatus.TUTOR_REJECTED) {
        await this.notificationService.notifyStudentLessonComplaintRejected({
          studentUserId: complaint.studentId,
          studentMezonUserId: student?.mezonUserId,
          tutorName: notificationDetails.tutorName,
          lessonStartAtLabel: notificationDetails.lessonStartAtLabel,
          lessonStartAtIso: notificationDetails.lessonStartAtIso,
          submittedAtLabel: notificationDetails.submittedAtLabel,
          reason: complaint.reason,
          amount: notificationDetails.amount,
          currency: notificationDetails.currency,
          adminNote,
          complaintId: updated.id,
        });
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to notify student for lesson complaint ${updated.id}: ${detail}`);
    }

    return {
      id: updated.id,
      status: updated.status as LessonComplaintStatusApi,
      refunded,
    };
  }

  private async notifyTutorOnApprovedRefund(
    complaint: ComplaintWithNotificationContext,
    updated: {
      id: string;
      status: ELessonComplaintStatus;
      lessonType: ELessonChangeLessonType;
      studentId: string;
      tutorId: string;
      subscriptionEnrollmentId: string | null;
      subscriptionSlotIndex: number | null;
    },
    details: StudentComplaintNotificationDetails
  ): Promise<void> {
    try {
      const [tutorProfile, student] = await Promise.all([
        this.prisma.tutorProfile.findUnique({
          where: { id: updated.tutorId },
          select: { userId: true, user: { select: { mezonUserId: true } } },
        }),
        this.prisma.user.findUnique({
          where: { id: updated.studentId },
          select: { username: true },
        }),
      ]);
      if (!tutorProfile) {
        this.logger.warn(`Tutor profile not found for complaint ${updated.id}`);
        return;
      }

      const studentName = student?.username ?? 'student';

      if (details.tutorAmount <= BigInt(0)) {
        this.logger.warn(`No tutor amount found for complaint ${updated.id}`);
        return;
      }

      await this.notificationService.notifyTutorLessonComplaintApproved({
        tutorUserId: tutorProfile.userId,
        tutorMezonUserId: tutorProfile.user.mezonUserId,
        studentName,
        lessonStartAtLabel: details.lessonStartAtLabel,
        submittedAtLabel: details.submittedAtLabel,
        reason: complaint.reason,
        studentMessage: complaint.message,
        amount: details.tutorAmount,
        currency: details.currency,
        dedupeKey: `tutor-lesson-complaint-approved:${updated.id}`,
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to notify tutor for lesson complaint ${updated.id}: ${detail}`
      );
    }
  }

  private resolveStudentComplaintNotificationDetails(
    complaint: ComplaintWithNotificationContext
  ): StudentComplaintNotificationDetails {
    let tutorName = 'tutor';
    let amount = BigInt(0);
    let tutorAmount = BigInt(0);
    let currency: ECurrency | undefined;
    let displayTimezone = 'UTC';

    if (complaint.lessonType === ELessonChangeLessonType.TRIAL && complaint.trialLessonBooking) {
      tutorName = complaint.trialLessonBooking.tutor.user.username ?? 'tutor';
      displayTimezone = complaint.trialLessonBooking.tutor.user.timezone ?? 'UTC';
      amount = complaint.trialLessonBooking.grossAmount;
      tutorAmount = complaint.trialLessonBooking.tutorAmount;
      currency = complaint.trialLessonBooking.currency as ECurrency;
    } else if (
      complaint.lessonType === ELessonChangeLessonType.SUBSCRIPTION &&
      complaint.subscriptionEnrollment
    ) {
      const slots = this.parseWeeklySlots(complaint.subscriptionEnrollment.weeklySlots);
      const slotCount = slots.length || 1;
      const slotIndex = complaint.subscriptionSlotIndex ?? 0;
      tutorName = complaint.subscriptionEnrollment.tutor.user.username ?? 'tutor';
      displayTimezone = complaint.subscriptionEnrollment.tutor.user.timezone ?? 'UTC';
      amount = subscriptionSlotGrossAmount(
        complaint.subscriptionEnrollment.grossAmount,
        slotCount,
        slotIndex
      );
      tutorAmount = subscriptionSlotTutorAmount(
        complaint.subscriptionEnrollment.tutorAmount,
        slotCount,
        slotIndex
      );
      currency = complaint.subscriptionEnrollment.currency as ECurrency;
    }

    const lessonStartAtIso = complaint.lessonStartAt.toISOString();
    const lessonStartAtLabel = this.formatComplaintInstantLabel(
      complaint.lessonStartAt,
      displayTimezone
    );
    const submittedAtLabel = this.formatComplaintInstantLabel(
      complaint.createdAt,
      displayTimezone
    );

    return {
      tutorName,
      lessonStartAtLabel,
      lessonStartAtIso,
      submittedAtLabel,
      amount,
      tutorAmount,
      currency,
    };
  }

  private formatComplaintInstantLabel(at: Date, timezoneName: string): string {
    const tz = timezoneName?.trim() || 'UTC';
    return dayjs(at).tz(tz).format('ddd, D MMM YYYY · HH:mm z');
  }

  private async assertTutorUser(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!user || user.role !== Role.TUTOR) {
      throw new ForbiddenException('Only tutors can access lesson complaints');
    }
  }

  private async resolveLessonContext(
    studentUserId: string,
    dto: CreateLessonComplaintDto
  ): Promise<ComplaintLessonContext> {
    if (dto.lessonType === ELessonChangeLessonType.TRIAL) {
      return this.resolveTrialContext(studentUserId, dto.trialLessonBookingId);
    }
    return this.resolveSubscriptionContext(
      studentUserId,
      dto.subscriptionEnrollmentId,
      dto.subscriptionSlotIndex,
      dto.lessonStartAt
    );
  }

  private async resolveTrialContext(
    studentUserId: string,
    bookingId?: string
  ): Promise<ComplaintLessonContext> {
    if (!bookingId) {
      throw new BadRequestException('trialLessonBookingId is required for trial lessons');
    }

    const booking = await this.prisma.trialLessonBooking.findUnique({
      where: { id: bookingId },
      include: { lessonComplaint: { select: { id: true } } },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    if (booking.studentId !== studentUserId) {
      throw new ForbiddenException('Not allowed to complain about this lesson');
    }
    if (booking.status === ETrialLessonStatus.CANCELLED) {
      throw new BadRequestException('Cancelled lessons cannot be complained about');
    }
    if (booking.paymentStatus !== EPaymentStatus.SUCCEEDED) {
      throw new BadRequestException('Only paid lessons can be complained about');
    }
    if (booking.lessonComplaint) {
      throw new BadRequestException('A complaint already exists for this lesson');
    }

    return {
      tutorId: booking.tutorId,
      lessonStartAt: booking.startAt,
      lessonDurationMinutes: booking.durationMinutes,
      trialLessonBookingId: booking.id,
    };
  }

  private async resolveSubscriptionContext(
    studentUserId: string,
    enrollmentId?: string,
    slotIndex?: number,
    lessonStartAtIso?: string
  ): Promise<ComplaintLessonContext> {
    if (!enrollmentId || slotIndex == null || !lessonStartAtIso) {
      throw new BadRequestException(
        'subscriptionEnrollmentId, subscriptionSlotIndex, and lessonStartAt are required'
      );
    }

    const lessonStart = dayjs(lessonStartAtIso).utc();
    if (!lessonStart.isValid()) {
      throw new BadRequestException('Invalid lessonStartAt');
    }

    const enrollment = await this.prisma.subscriptionEnrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        tutor: { select: { userId: true, user: { select: { timezone: true } } } },
      },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }
    if (enrollment.studentId !== studentUserId) {
      throw new ForbiddenException('Not allowed to complain about this lesson');
    }
    if (enrollment.paymentStatus !== EPaymentStatus.SUCCEEDED) {
      throw new BadRequestException('Only paid lessons can be complained about');
    }

    const slots = this.parseWeeklySlots(enrollment.weeklySlots);
    if (slotIndex < 0 || slotIndex >= slots.length) {
      throw new BadRequestException('Invalid lesson slot');
    }

    const slot = slots[slotIndex];
    const slotStatus = normalizeSubscriptionSlotStatus(slot?.status);
    if (slotStatus === ESubscriptionLessonSlotStatus.CANCELLED) {
      throw new BadRequestException('Cancelled lessons cannot be complained about');
    }
    if (slotStatus === ESubscriptionLessonSlotStatus.REFUNDED) {
      throw new BadRequestException('This lesson has already been refunded');
    }

    const tutorTimezone = enrollment.tutor.user?.timezone ?? 'UTC';
    const occurrences = subscriptionConcreteOccurrencesSorted(slots, tutorTimezone);
    const occurrence = occurrences.find(
      (o) => o.slotIndex === slotIndex && dayjs(o.startAt).utc().isSame(lessonStart, 'minute')
    );
    if (!occurrence) {
      throw new BadRequestException('Lesson occurrence not found');
    }

    const finished = isLessonFinishedForComplaint(
      occurrence.startAt,
      slot.durationMinutes,
      new Date()
    );
    const slotCompleted = isSubscriptionSlotCompleted(slot?.status);
    if (!finished && !slotCompleted) {
      throw new BadRequestException('Complaints are only allowed after the lesson has ended');
    }

    const existing = await this.prisma.lessonComplaint.findFirst({
      where: {
        subscriptionEnrollmentId: enrollmentId,
        subscriptionSlotIndex: slotIndex,
        lessonStartAt: occurrence.startAt,
      },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException('A complaint already exists for this lesson');
    }

    return {
      tutorId: enrollment.tutorId,
      lessonStartAt: occurrence.startAt,
      lessonDurationMinutes: slot.durationMinutes,
      subscriptionEnrollmentId: enrollment.id,
      subscriptionSlotIndex: slotIndex,
    };
  }

  private parseWeeklySlots(value: Prisma.JsonValue): SubscriptionWeeklySlotDto[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value as unknown as SubscriptionWeeklySlotDto[];
  }
}
