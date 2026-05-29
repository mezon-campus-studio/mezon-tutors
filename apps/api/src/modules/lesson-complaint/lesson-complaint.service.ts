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
  ENotificationType,
  EPaymentStatus,
  ESubscriptionLessonSlotStatus,
  ETrialLessonStatus,
  Prisma,
  Role,
} from '@mezon-tutors/db';
import {
  type StudentLessonComplaintItem,
  type AdminLessonComplaintListItem,
  type AdminLessonComplaintMetrics,
  type LessonComplaintCreatedResult,
  type ReviewLessonComplaintResult,
  NOTIFICATION_I18N_KEYS,
  ELessonComplaintStatus as LessonComplaintStatusApi,
  isLessonFinishedForComplaint,
  isSubscriptionSlotCompleted,
  isWithinLessonComplaintWindow,
  normalizeSubscriptionSlotStatus,
  subscriptionConcreteOccurrencesSorted,
  subscriptionSlotGrossAmount,
  type LessonComplaintStatusFilter,
  type SubscriptionWeeklySlotDto,
} from '@mezon-tutors/shared';
import dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { WalletService } from '../wallet/wallet.service';
import { AppSettingsService } from '../app-settings/app-settings.service';
import type { CreateLessonComplaintDto } from './dto/create-lesson-complaint.dto';
import type { ReviewLessonComplaintDto } from './dto/review-lesson-complaint.dto';

dayjs.extend(utc);

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

@Injectable()
export class LessonComplaintService {
  private readonly logger = new Logger(LessonComplaintService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly notificationService: NotificationService,
    private readonly appSettingsService: AppSettingsService,
  ) {}

  async createComplaint(
    studentUserId: string,
    dto: CreateLessonComplaintDto
  ): Promise<LessonComplaintCreatedResult> {
    const student = await this.prisma.user.findUnique({
      where: { id: studentUserId },
      select: { id: true, role: true },
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
        settings.disputePeriodHours,
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
      },
      select: { id: true, status: true },
    });

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
      lesson_start_at: row.lessonStartAt.toISOString(),
      lesson_duration_minutes: row.lessonDurationMinutes,
      created_at: row.createdAt.toISOString(),
      admin_note: row.adminNote,
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
      } else if (
        row.subscriptionEnrollment &&
        row.subscriptionSlotIndex != null
      ) {
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
        reviewed_at: row.reviewedAt?.toISOString() ?? null,
      };
    });
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
          select: { id: true, paymentStatus: true },
        },
        subscriptionEnrollment: {
          select: {
            id: true,
            studentId: true,
            grossAmount: true,
            tutorAmount: true,
            weeklySlots: true,
            paymentStatus: true,
            tutor: { select: { userId: true, user: { select: { username: true } } } },
          },
        },
      },
    });

    if (!complaint) {
      throw new NotFoundException('Complaint not found');
    }
    if (complaint.status !== ELessonComplaintStatus.PENDING) {
      throw new BadRequestException('This complaint has already been reviewed');
    }

    let refunded = false;

    if (targetStatus === 'APPROVED') {
      if (complaint.lessonType === ELessonChangeLessonType.TRIAL && complaint.trialLessonBookingId) {
        const booking = complaint.trialLessonBooking;
        if (!booking || booking.paymentStatus === EPaymentStatus.REFUNDED) {
          throw new BadRequestException('This lesson has already been refunded');
        }
        refunded = await this.walletService.refundTrialLessonBooking(complaint.trialLessonBookingId, {
          refundDescription: 'Refund approved for lesson complaint',
        });
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
      select: { id: true, status: true },
    });

    try {
      const isApproved = targetStatus === 'APPROVED';
      const i18nKey = isApproved
        ? refunded
          ? NOTIFICATION_I18N_KEYS.templates.lessonComplaintApprovedRefunded
          : NOTIFICATION_I18N_KEYS.templates.lessonComplaintApproved
        : NOTIFICATION_I18N_KEYS.templates.lessonComplaintRejected;

      await this.notificationService.createForUser(complaint.studentId, {
        title: isApproved ? 'Complaint approved' : 'Complaint rejected',
        content: isApproved
          ? refunded
            ? 'Your lesson complaint has been approved. Refund has been processed to your wallet.'
            : 'Your lesson complaint has been approved.'
          : 'Your lesson complaint has been rejected. Please check the admin note for details.',
        type: ENotificationType.SYSTEM,
        i18nKey,
        i18nParams: {},
        dedupeKey: `lesson-complaint-reviewed:${updated.id}`,
        metadata: {
          titleI18nKey: isApproved
            ? NOTIFICATION_I18N_KEYS.titles.lessonComplaintApproved
            : NOTIFICATION_I18N_KEYS.titles.lessonComplaintRejected,
          titleI18nParams: {},
          complaintId: updated.id,
          status: updated.status,
          refunded,
          adminNote: dto.adminNote?.trim() || null,
        },
      });
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

    const tutorTimezone = enrollment.tutor.user?.timezone ?? 'UTC';
    const occurrences = subscriptionConcreteOccurrencesSorted(slots, tutorTimezone);
    const occurrence = occurrences.find(
      (o) =>
        o.slotIndex === slotIndex && dayjs(o.startAt).utc().isSame(lessonStart, 'minute')
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
