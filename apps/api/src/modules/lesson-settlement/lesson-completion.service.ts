import { Injectable, Logger } from '@nestjs/common';
import {
  ELessonSettlementJobStatus,
  ELessonSettlementKind,
  EPaymentStatus,
  ESubscriptionEnrollmentStatus,
  ETrialLessonStatus,
  Prisma,
} from '@mezon-tutors/db';
import {
  DEFAULT_TIMEZONE,
  ESubscriptionLessonSlotStatus,
  LESSON_AUTO_COMPLETE_GRACE_MINUTES,
  addMinutes,
  normalizeSubscriptionSlotStatus,
  subscriptionConcreteOccurrencesSorted,
  type SubscriptionWeeklySlotDto,
} from '@mezon-tutors/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { GoogleCalendarSyncService } from '../google-calendar/google-calendar-sync.service';

const MAX_COMPLETION_ATTEMPTS = 5;

@Injectable()
export class LessonCompletionService {
  private readonly logger = new Logger(LessonCompletionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly googleCalendarSyncService: GoogleCalendarSyncService,
  ) {}

  private getCompletionRunAt(lessonEndAt: Date): Date {
    return addMinutes(lessonEndAt, LESSON_AUTO_COMPLETE_GRACE_MINUTES);
  }

  private async scheduleJob(params: {
    kind: ELessonSettlementKind;
    bookingId?: string;
    enrollmentId?: string;
    slotIndex?: number;
    runAt: Date;
    dedupeKey: string;
  }): Promise<void> {
    const existing = await this.prisma.lessonCompletionJob.findUnique({
      where: { dedupeKey: params.dedupeKey },
      select: { id: true },
    });
    if (existing) {
      return;
    }

    await this.prisma.lessonCompletionJob.create({
      data: {
        kind: params.kind,
        bookingId: params.bookingId,
        enrollmentId: params.enrollmentId,
        slotIndex: params.slotIndex,
        runAt: params.runAt,
        dedupeKey: params.dedupeKey,
        status: ELessonSettlementJobStatus.PENDING,
      },
    });
  }

  async scheduleTrialLessonCompletion(bookingId: string): Promise<void> {
    const booking = await this.prisma.trialLessonBooking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        startAt: true,
        durationMinutes: true,
        paymentStatus: true,
        status: true,
      },
    });
    if (!booking) {
      return;
    }
    if (booking.paymentStatus !== EPaymentStatus.SUCCEEDED) {
      return;
    }
    if (
      booking.status !== ETrialLessonStatus.CONFIRMED &&
      booking.status !== ETrialLessonStatus.COMPLETED
    ) {
      return;
    }

    const lessonEndAt = addMinutes(booking.startAt, booking.durationMinutes);
    await this.scheduleJob({
      kind: ELessonSettlementKind.TRIAL_LESSON,
      bookingId: booking.id,
      runAt: this.getCompletionRunAt(lessonEndAt),
      dedupeKey: `trial:${booking.id}`,
    });
  }

  async scheduleSubscriptionEnrollmentCompletions(enrollmentId: string): Promise<void> {
    const enrollment = await this.prisma.subscriptionEnrollment.findUnique({
      where: { id: enrollmentId },
      select: {
        id: true,
        weeklySlots: true,
        paymentStatus: true,
        status: true,
      },
    });
    if (!enrollment) {
      return;
    }
    if (enrollment.paymentStatus !== EPaymentStatus.SUCCEEDED) {
      return;
    }
    if (enrollment.status !== ESubscriptionEnrollmentStatus.ACTIVE) {
      return;
    }

    const slots = this.parseWeeklySlots(enrollment.weeklySlots);
    const occurrences = subscriptionConcreteOccurrencesSorted(slots, DEFAULT_TIMEZONE);
    for (const occ of occurrences) {
      const slot = slots[occ.slotIndex];
      if (!slot) {
        continue;
      }
      const slotStatus = normalizeSubscriptionSlotStatus(slot.status);
      if (
        slotStatus === ESubscriptionLessonSlotStatus.CANCELLED ||
        slotStatus === ESubscriptionLessonSlotStatus.REFUNDED ||
        slotStatus === ESubscriptionLessonSlotStatus.COMPLETED
      ) {
        continue;
      }
      await this.scheduleJob({
        kind: ELessonSettlementKind.SUBSCRIPTION_SLOT,
        enrollmentId: enrollment.id,
        slotIndex: occ.slotIndex,
        runAt: this.getCompletionRunAt(occ.endAt),
        dedupeKey: `sub:${enrollment.id}:${occ.slotIndex}`,
      });
    }
  }

  async reconcilePendingSchedules(): Promise<void> {
    const [trials, enrollments] = await Promise.all([
      this.prisma.trialLessonBooking.findMany({
        where: {
          paymentStatus: EPaymentStatus.SUCCEEDED,
          status: { in: [ETrialLessonStatus.CONFIRMED, ETrialLessonStatus.COMPLETED] },
        },
        select: { id: true },
      }),
      this.prisma.subscriptionEnrollment.findMany({
        where: {
          paymentStatus: EPaymentStatus.SUCCEEDED,
          status: ESubscriptionEnrollmentStatus.ACTIVE,
        },
        select: { id: true },
      }),
    ]);

    for (const booking of trials) {
      await this.scheduleTrialLessonCompletion(booking.id);
    }
    for (const enrollment of enrollments) {
      await this.scheduleSubscriptionEnrollmentCompletions(enrollment.id);
    }
  }

  async processDueCompletions(now = new Date()): Promise<void> {
    const jobs = await this.prisma.lessonCompletionJob.findMany({
      where: {
        status: ELessonSettlementJobStatus.PENDING,
        runAt: { lte: now },
      },
      orderBy: { runAt: 'asc' },
      take: 50,
    });

    for (const job of jobs) {
      try {
        if (job.kind === ELessonSettlementKind.TRIAL_LESSON && job.bookingId) {
          await this.completeTrialLesson(job.id, job.bookingId);
        } else if (
          job.kind === ELessonSettlementKind.SUBSCRIPTION_SLOT &&
          job.enrollmentId != null &&
          job.slotIndex != null
        ) {
          await this.completeSubscriptionSlot(job.id, job.enrollmentId, job.slotIndex);
        } else {
          await this.failJob(job.id, 'Invalid completion job payload');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Completion job ${job.id} failed: ${message}`, error);
        await this.recordJobFailure(job.id, message);
      }
    }
  }

  private parseWeeklySlots(value: Prisma.JsonValue): SubscriptionWeeklySlotDto[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value as unknown as SubscriptionWeeklySlotDto[];
  }

  private async recordJobFailure(jobId: string, message: string): Promise<void> {
    const job = await this.prisma.lessonCompletionJob.findUnique({
      where: { id: jobId },
      select: { attempts: true },
    });
    if (!job) {
      return;
    }
    const attempts = job.attempts + 1;
    await this.prisma.lessonCompletionJob.update({
      where: { id: jobId },
      data: {
        attempts,
        lastError: message.slice(0, 2000),
        status:
          attempts >= MAX_COMPLETION_ATTEMPTS
            ? ELessonSettlementJobStatus.FAILED
            : ELessonSettlementJobStatus.PENDING,
      },
    });
  }

  private async failJob(jobId: string, message: string): Promise<void> {
    await this.prisma.lessonCompletionJob.update({
      where: { id: jobId },
      data: {
        status: ELessonSettlementJobStatus.FAILED,
        lastError: message,
        processedAt: new Date(),
      },
    });
  }

  private async completeJob(jobId: string): Promise<void> {
    await this.prisma.lessonCompletionJob.update({
      where: { id: jobId },
      data: {
        status: ELessonSettlementJobStatus.COMPLETED,
        processedAt: new Date(),
        lastError: null,
      },
    });
  }

  private async completeTrialLesson(jobId: string, bookingId: string): Promise<void> {
    const result = await this.prisma.$transaction(async (tx) => {
      const booking = await tx.trialLessonBooking.findUnique({
        where: { id: bookingId },
        select: {
          id: true,
          status: true,
          paymentStatus: true,
        },
      });
      if (!booking) {
        return { outcome: 'fail' as const, reason: 'Booking not found' };
      }
      if (booking.paymentStatus !== EPaymentStatus.SUCCEEDED) {
        return { outcome: 'fail' as const, reason: 'Payment not succeeded' };
      }
      if (booking.status === ETrialLessonStatus.CANCELLED) {
        return { outcome: 'cancel' as const };
      }
      if (booking.status === ETrialLessonStatus.COMPLETED) {
        return { outcome: 'done' as const };
      }
      if (booking.status !== ETrialLessonStatus.CONFIRMED) {
        return { outcome: 'fail' as const, reason: `Unexpected booking status ${booking.status}` };
      }

      await tx.trialLessonBooking.update({
        where: { id: booking.id },
        data: { status: ETrialLessonStatus.COMPLETED },
      });

      return { outcome: 'done' as const };
    });

    if (result.outcome === 'done') {
      await this.completeJob(jobId);
      this.googleCalendarSyncService.dispatchTrialBookingSync(bookingId);
      return;
    }
    if (result.outcome === 'cancel') {
      await this.completeJob(jobId);
      return;
    }
    await this.failJob(jobId, 'reason' in result ? result.reason : 'Completion failed');
  }

  private async completeSubscriptionSlot(
    jobId: string,
    enrollmentId: string,
    slotIndex: number,
  ): Promise<void> {
    const result = await this.prisma.$transaction(async (tx) => {
      const enrollment = await tx.subscriptionEnrollment.findUnique({
        where: { id: enrollmentId },
        select: {
          id: true,
          weeklySlots: true,
          paymentStatus: true,
          status: true,
        },
      });
      if (!enrollment) {
        return { outcome: 'fail' as const, reason: 'Enrollment not found' };
      }
      if (enrollment.paymentStatus !== EPaymentStatus.SUCCEEDED) {
        return { outcome: 'fail' as const, reason: 'Payment not succeeded' };
      }
      if (enrollment.status !== ESubscriptionEnrollmentStatus.ACTIVE) {
        return { outcome: 'cancel' as const };
      }

      const slots = this.parseWeeklySlots(enrollment.weeklySlots);
      const slot = slots[slotIndex];
      if (!slot) {
        return { outcome: 'fail' as const, reason: 'Slot not found' };
      }

      const slotStatus = normalizeSubscriptionSlotStatus(slot.status);
      if (
        slotStatus === ESubscriptionLessonSlotStatus.CANCELLED ||
        slotStatus === ESubscriptionLessonSlotStatus.REFUNDED
      ) {
        return { outcome: 'cancel' as const };
      }
      if (slotStatus === ESubscriptionLessonSlotStatus.COMPLETED) {
        return { outcome: 'done' as const };
      }

      const updatedSlots = slots.map((s, i) =>
        i === slotIndex ? { ...s, status: ESubscriptionLessonSlotStatus.COMPLETED } : s,
      );
      await tx.subscriptionEnrollment.update({
        where: { id: enrollment.id },
        data: { weeklySlots: updatedSlots as unknown as Prisma.InputJsonValue },
      });

      return { outcome: 'done' as const };
    });

    if (result.outcome === 'done') {
      await this.completeJob(jobId);
      this.googleCalendarSyncService.dispatchSubscriptionEnrollmentSync(enrollmentId);
      return;
    }
    if (result.outcome === 'cancel') {
      await this.completeJob(jobId);
      return;
    }
    await this.failJob(jobId, 'reason' in result ? result.reason : 'Completion failed');
  }
}
