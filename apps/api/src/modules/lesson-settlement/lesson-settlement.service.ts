import { Injectable, Logger } from '@nestjs/common';
import {
  ECurrency,
  ELessonSettlementJobStatus,
  ELessonSettlementKind,
  EPaymentStatus,
  ESubscriptionEnrollmentStatus,
  ETrialLessonStatus,
  EWalletTransactionDirection,
  EWalletTransactionType,
  Prisma,
} from '@mezon-tutors/db';
import {
  DEFAULT_TIMEZONE,
  LESSON_SETTLEMENT_GRACE_MINUTES,
  addMinutes,
  ESubscriptionLessonSlotStatus,
  normalizeSubscriptionSlotStatus,
  subscriptionConcreteOccurrencesSorted,
  subscriptionSlotTutorAmount,
  type SubscriptionWeeklySlotDto,
} from '@mezon-tutors/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { AppSettingsService } from '../app-settings/app-settings.service';

const MAX_SETTLEMENT_ATTEMPTS = 5;

@Injectable()
export class LessonSettlementService {
  private readonly logger = new Logger(LessonSettlementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly appSettingsService: AppSettingsService,
  ) {}

  private async getSettlementReleaseAt(lessonEndAt: Date): Promise<Date> {
    const settings = await this.appSettingsService.getSettings();
    return addMinutes(
      addMinutes(lessonEndAt, settings.settlementPeriodHours * 60),
      LESSON_SETTLEMENT_GRACE_MINUTES,
    );
  }

  private async scheduleJob(params: {
    kind: ELessonSettlementKind;
    bookingId?: string;
    enrollmentId?: string;
    slotIndex?: number;
    runAt: Date;
    dedupeKey: string;
  }): Promise<void> {
    const existing = await this.prisma.lessonSettlementJob.findUnique({
      where: { dedupeKey: params.dedupeKey },
      select: { id: true },
    });
    if (existing) {
      return;
    }

    await this.prisma.lessonSettlementJob.create({
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

  async scheduleTrialLessonSettlement(bookingId: string): Promise<void> {
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
    const runAt = await this.getSettlementReleaseAt(lessonEndAt);
    await this.scheduleJob({
      kind: ELessonSettlementKind.TRIAL_LESSON,
      bookingId: booking.id,
      runAt,
      dedupeKey: `trial:${booking.id}`,
    });
  }

  async scheduleSubscriptionEnrollmentSettlements(enrollmentId: string): Promise<void> {
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
      if (
        normalizeSubscriptionSlotStatus(slot.status) === ESubscriptionLessonSlotStatus.COMPLETED
      ) {
        continue;
      }
      const runAt = await this.getSettlementReleaseAt(occ.endAt);
      await this.scheduleJob({
        kind: ELessonSettlementKind.SUBSCRIPTION_SLOT,
        enrollmentId: enrollment.id,
        slotIndex: occ.slotIndex,
        runAt,
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
      await this.scheduleTrialLessonSettlement(booking.id);
    }
    for (const enrollment of enrollments) {
      await this.scheduleSubscriptionEnrollmentSettlements(enrollment.id);
    }
  }

  async processDueJobs(now = new Date()): Promise<void> {
    const jobs = await this.prisma.lessonSettlementJob.findMany({
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
          await this.settleTrialLesson(job.id, job.bookingId, now);
        } else if (
          job.kind === ELessonSettlementKind.SUBSCRIPTION_SLOT &&
          job.enrollmentId != null &&
          job.slotIndex != null
        ) {
          await this.settleSubscriptionSlot(job.id, job.enrollmentId, job.slotIndex, now);
        } else {
          await this.failJob(job.id, 'Invalid settlement job payload');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Settlement job ${job.id} failed: ${message}`, error);
        await this.recordJobFailure(job.id, message);
      }
    }
  }

  private async recordJobFailure(jobId: string, message: string): Promise<void> {
    const job = await this.prisma.lessonSettlementJob.findUnique({
      where: { id: jobId },
      select: { attempts: true },
    });
    if (!job) {
      return;
    }
    const attempts = job.attempts + 1;
    await this.prisma.lessonSettlementJob.update({
      where: { id: jobId },
      data: {
        attempts,
        lastError: message.slice(0, 2000),
        status:
          attempts >= MAX_SETTLEMENT_ATTEMPTS
            ? ELessonSettlementJobStatus.FAILED
            : ELessonSettlementJobStatus.PENDING,
      },
    });
  }

  private async failJob(jobId: string, message: string): Promise<void> {
    await this.prisma.lessonSettlementJob.update({
      where: { id: jobId },
      data: {
        status: ELessonSettlementJobStatus.FAILED,
        lastError: message,
        processedAt: new Date(),
      },
    });
  }

  private async completeJob(jobId: string): Promise<void> {
    await this.prisma.lessonSettlementJob.update({
      where: { id: jobId },
      data: {
        status: ELessonSettlementJobStatus.COMPLETED,
        processedAt: new Date(),
        lastError: null,
      },
    });
  }

  private parseWeeklySlots(value: Prisma.JsonValue): SubscriptionWeeklySlotDto[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value as unknown as SubscriptionWeeklySlotDto[];
  }

  private async settleTrialLesson(jobId: string, bookingId: string, now: Date): Promise<void> {
    const result = await this.prisma.$transaction(async (tx) => {
      const booking = await tx.trialLessonBooking.findUnique({
        where: { id: bookingId },
        include: {
          tutor: { select: { userId: true } },
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
        return { outcome: 'done' as const, released: false };
      }
      if (booking.status !== ETrialLessonStatus.CONFIRMED) {
        return { outcome: 'fail' as const, reason: `Unexpected booking status ${booking.status}` };
      }

      const lessonEndAt = addMinutes(booking.startAt, booking.durationMinutes);
      const releaseAt = await this.getSettlementReleaseAt(lessonEndAt);
      if (now < releaseAt) {
        return { outcome: 'retry' as const, reason: 'Lesson grace period not elapsed' };
      }

      const existingRelease = await tx.transaction.findFirst({
        where: {
          bookingId: booking.id,
          type: EWalletTransactionType.RELEASE,
        },
      });
      if (existingRelease) {
        await tx.trialLessonBooking.update({
          where: { id: booking.id },
          data: { status: ETrialLessonStatus.COMPLETED },
        });
        return { outcome: 'done' as const, released: false };
      }

      const wallet = await tx.wallet.findUnique({
        where: { userId: booking.tutor.userId },
      });
      if (!wallet) {
        return { outcome: 'fail' as const, reason: 'Tutor wallet not found' };
      }
      if (wallet.pendingBalance < booking.tutorAmount) {
        return {
          outcome: 'fail' as const,
          reason: 'Insufficient pending balance for trial lesson release',
        };
      }

      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          pendingBalance: { decrement: booking.tutorAmount },
          balance: { increment: booking.tutorAmount },
        },
      });

      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          bookingId: booking.id,
          type: EWalletTransactionType.RELEASE,
          direction: EWalletTransactionDirection.CREDIT,
          amount: booking.tutorAmount,
          description: `Trial lesson earnings released for booking ${booking.id}`,
        },
      });

      await tx.trialLessonBooking.update({
        where: { id: booking.id },
        data: { status: ETrialLessonStatus.COMPLETED },
      });

      return {
        outcome: 'done' as const,
        released: true,
        tutorUserId: booking.tutor.userId,
        amount: booking.tutorAmount,
        currency: booking.currency,
        lessonKind: 'trial' as const,
        bookingId: booking.id,
      };
    });

    if (result.outcome === 'done') {
      await this.completeJob(jobId);
      if (result.released && result.tutorUserId && result.amount != null) {
        await this.notificationService.notifyTutorEarningsReleased({
          tutorUserId: result.tutorUserId,
          amount: result.amount,
          currency: result.currency,
          lessonKind: 'trial',
          bookingId: result.bookingId,
          dedupeKey: `tutor-earnings-released:trial:${result.bookingId}`,
        });
      }
      return;
    }
    if (result.outcome === 'cancel') {
      await this.completeJob(jobId);
      return;
    }
    if (result.outcome === 'retry') {
      await this.recordJobFailure(jobId, result.reason);
      return;
    }
    await this.failJob(jobId, 'reason' in result ? result.reason : 'Settlement failed');
  }

  private async settleSubscriptionSlot(
    jobId: string,
    enrollmentId: string,
    slotIndex: number,
    now: Date
  ): Promise<void> {
    const result = await this.prisma.$transaction(async (tx) => {
      const enrollment = await tx.subscriptionEnrollment.findUnique({
        where: { id: enrollmentId },
        include: {
          tutor: { select: { userId: true } },
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
      if (slotStatus === ESubscriptionLessonSlotStatus.CANCELLED) {
        return { outcome: 'cancel' as const };
      }
      if (slotStatus === ESubscriptionLessonSlotStatus.COMPLETED) {
        return { outcome: 'done' as const, released: false };
      }

      const occurrences = subscriptionConcreteOccurrencesSorted(slots, DEFAULT_TIMEZONE);
      const occ = occurrences.find((o) => o.slotIndex === slotIndex);
      if (!occ) {
        return { outcome: 'fail' as const, reason: 'Slot occurrence could not be resolved' };
      }

      const releaseAt = await this.getSettlementReleaseAt(occ.endAt);
      if (now < releaseAt) {
        return { outcome: 'retry' as const, reason: 'Lesson grace period not elapsed' };
      }

      const releaseAmount = subscriptionSlotTutorAmount(
        enrollment.tutorAmount,
        slots.length,
        slotIndex
      );
      if (releaseAmount <= 0n) {
        return { outcome: 'fail' as const, reason: 'Invalid slot release amount' };
      }

      const existingRelease = await tx.transaction.findFirst({
        where: {
          subscriptionEnrollmentId: enrollment.id,
          subscriptionSlotIndex: slotIndex,
          type: EWalletTransactionType.RELEASE,
        },
      });
      if (existingRelease) {
        const updatedSlots = slots.map((s, i) =>
          i === slotIndex ? { ...s, status: ESubscriptionLessonSlotStatus.COMPLETED } : s
        );
        await tx.subscriptionEnrollment.update({
          where: { id: enrollment.id },
          data: { weeklySlots: updatedSlots as unknown as Prisma.InputJsonValue },
        });
        return { outcome: 'done' as const, released: false };
      }

      const wallet = await tx.wallet.findUnique({
        where: { userId: enrollment.tutor.userId },
      });
      if (!wallet) {
        return { outcome: 'fail' as const, reason: 'Tutor wallet not found' };
      }
      if (wallet.pendingBalance < releaseAmount) {
        return {
          outcome: 'fail' as const,
          reason: 'Insufficient pending balance for subscription slot release',
        };
      }

      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          pendingBalance: { decrement: releaseAmount },
          balance: { increment: releaseAmount },
        },
      });

      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          subscriptionEnrollmentId: enrollment.id,
          subscriptionSlotIndex: slotIndex,
          type: EWalletTransactionType.RELEASE,
          direction: EWalletTransactionDirection.CREDIT,
          amount: releaseAmount,
          description: `Subscription lesson ${slotIndex + 1} earnings released for ${enrollment.id}`,
        },
      });

      const updatedSlots = slots.map((s, i) =>
        i === slotIndex ? { ...s, status: ESubscriptionLessonSlotStatus.COMPLETED } : s
      );
      await tx.subscriptionEnrollment.update({
        where: { id: enrollment.id },
        data: { weeklySlots: updatedSlots as unknown as Prisma.InputJsonValue },
      });

      return {
        outcome: 'done' as const,
        released: true,
        tutorUserId: enrollment.tutor.userId,
        amount: releaseAmount,
        currency: enrollment.currency ?? ECurrency.VND,
        lessonKind: 'subscription' as const,
        enrollmentId: enrollment.id,
        slotIndex,
      };
    });

    if (result.outcome === 'done') {
      await this.completeJob(jobId);
      if (result.released && result.tutorUserId && result.amount != null) {
        await this.notificationService.notifyTutorEarningsReleased({
          tutorUserId: result.tutorUserId,
          amount: result.amount,
          currency: result.currency ?? ECurrency.VND,
          lessonKind: 'subscription',
          enrollmentId: result.enrollmentId,
          slotIndex: result.slotIndex,
          dedupeKey: `tutor-earnings-released:sub:${result.enrollmentId}:${result.slotIndex}`,
        });
      }
      return;
    }
    if (result.outcome === 'cancel') {
      await this.completeJob(jobId);
      return;
    }
    if (result.outcome === 'retry') {
      await this.recordJobFailure(jobId, result.reason);
      return;
    }
    await this.failJob(jobId, 'reason' in result ? result.reason : 'Settlement failed');
  }
}
