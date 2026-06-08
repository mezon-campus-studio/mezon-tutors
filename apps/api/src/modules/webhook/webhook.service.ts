import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  EPaymentStatus,
  ESubscriptionEnrollmentStatus,
  ETrialLessonStatus,
  Prisma,
} from '@mezon-tutors/db';
import {
  LESSON_CANCEL_REASON_SLOT_CONFLICT,
  LESSON_CHECKOUT_SLOT_UNAVAILABLE_AFTER_PAYMENT_CODE,
  mapVnpayResponseToLessonCancelCode,
  ROUTES,
  type LessonCheckoutCancelCode,
} from '@mezon-tutors/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { AppConfigService } from '../../shared/services/app-config.service';
import { LessonSettlementService } from '../lesson-settlement/lesson-settlement.service';
import { NotificationService } from '../notification/notification.service';
import { VnpayService } from '../vnpay/vnpay.service';
import { WalletCheckoutService } from '../wallet/wallet-checkout.service';
import { TrialLessonBookingService } from '../trial-lesson-booking/trial-lesson-booking.service';

type VnpayQuery = Record<string, string | string[] | undefined>;

export type ApplyVnpayPaymentResult =
  | {
      kind: 'trial';
      updated: boolean;
      bookingId: string;
      paymentStatus: EPaymentStatus;
      status: ETrialLessonStatus;
      slotConflictAfterPayment: boolean;
      responseCode: string | undefined;
      transactionStatus: string | undefined;
    }
  | {
      kind: 'subscription';
      updated: boolean;
      enrollmentId: string;
      paymentStatus: EPaymentStatus;
      status: ESubscriptionEnrollmentStatus;
      slotConflictAfterPayment: boolean;
      responseCode: string | undefined;
      transactionStatus: string | undefined;
    };

@Injectable()
export class WebhookService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vnpayService: VnpayService,
    private readonly appConfig: AppConfigService,
    private readonly notificationService: NotificationService,
    private readonly lessonSettlementService: LessonSettlementService,
    private readonly walletCheckoutService: WalletCheckoutService,
    private readonly trialLessonBookingService: TrialLessonBookingService,
  ) {}

  private lessonCheckoutCancelUrl(
    frontend: string,
    checkout: 'trial' | 'subscription',
    code: LessonCheckoutCancelCode,
    resourceId?: string,
  ): string {
    const base =
      checkout === 'trial'
        ? `${frontend}${ROUTES.CHECKOUT.TRIAL_LESSON_CANCEL_WITH_CODE(code)}`
        : `${frontend}${ROUTES.CHECKOUT.SUBSCRIPTION_PLAN_CANCEL_WITH_CODE(code)}`;
    if (!resourceId) {
      return base;
    }
    const param = checkout === 'trial' ? 'bookingId' : 'enrollmentId';
    return `${base}&${param}=${encodeURIComponent(resourceId)}`;
  }

  async buildTrialLessonVnpayReturnRedirectUrl(query: VnpayQuery): Promise<string> {
    const frontend = this.appConfig.frontendUrl.replace(/\/$/, '');
    const toTrialCancel = (code: LessonCheckoutCancelCode, bookingId?: string) =>
      this.lessonCheckoutCancelUrl(frontend, 'trial', code, bookingId);
    const toSubCancel = (code: LessonCheckoutCancelCode, enrollmentId?: string) =>
      this.lessonCheckoutCancelUrl(frontend, 'subscription', code, enrollmentId);

    const verification = this.vnpayService.verifyReturnUrl(query);
    if (!verification.isVerified) {
      return toTrialCancel('invalid_signature');
    }

    try {
      const result = await this.applyVnpayPaymentResult(query);
      if (result.kind === 'subscription') {
        if (result.slotConflictAfterPayment) {
          return toSubCancel(
            LESSON_CHECKOUT_SLOT_UNAVAILABLE_AFTER_PAYMENT_CODE,
            result.enrollmentId,
          );
        }
        if (result.paymentStatus === EPaymentStatus.SUCCEEDED) {
          return `${frontend}${ROUTES.CHECKOUT.SUBSCRIPTION_PLAN_SUCCESS(result.enrollmentId)}`;
        }
        const code = mapVnpayResponseToLessonCancelCode(
          result.responseCode,
          result.transactionStatus
        );
        return toSubCancel(code, result.enrollmentId);
      }
      if (result.slotConflictAfterPayment) {
        return toTrialCancel(
          LESSON_CHECKOUT_SLOT_UNAVAILABLE_AFTER_PAYMENT_CODE,
          result.bookingId,
        );
      }
      if (result.paymentStatus === EPaymentStatus.SUCCEEDED) {
        return `${frontend}${ROUTES.CHECKOUT.TRIAL_LESSON_SUCCESS(result.bookingId)}`;
      }
      const code = mapVnpayResponseToLessonCancelCode(
        result.responseCode,
        result.transactionStatus
      );
      return toTrialCancel(code, result.bookingId);
    } catch (e) {
      if (e instanceof NotFoundException) {
        return toTrialCancel('order_not_found');
      }
      if (e instanceof BadRequestException) {
        return toTrialCancel('gateway_error');
      }
      throw e;
    }
  }

  async buildSubscriptionEnrollmentVnpayReturnRedirectUrl(query: VnpayQuery): Promise<string> {
    const frontend = this.appConfig.frontendUrl.replace(/\/$/, '');
    const toSubCancel = (code: LessonCheckoutCancelCode, enrollmentId?: string) =>
      this.lessonCheckoutCancelUrl(frontend, 'subscription', code, enrollmentId);
    const toTrialCancel = (code: LessonCheckoutCancelCode, bookingId?: string) =>
      this.lessonCheckoutCancelUrl(frontend, 'trial', code, bookingId);

    const verification = this.vnpayService.verifyReturnUrl(query);
    if (!verification.isVerified) {
      return toSubCancel('invalid_signature');
    }

    try {
      const result = await this.applyVnpayPaymentResult(query);
      if (result.kind === 'trial') {
        if (result.slotConflictAfterPayment) {
          return toTrialCancel(
            LESSON_CHECKOUT_SLOT_UNAVAILABLE_AFTER_PAYMENT_CODE,
            result.bookingId,
          );
        }
        if (result.paymentStatus === EPaymentStatus.SUCCEEDED) {
          return `${frontend}${ROUTES.CHECKOUT.TRIAL_LESSON_SUCCESS(result.bookingId)}`;
        }
        const code = mapVnpayResponseToLessonCancelCode(
          result.responseCode,
          result.transactionStatus
        );
        return toTrialCancel(code, result.bookingId);
      }
      if (result.slotConflictAfterPayment) {
        return toSubCancel(
          LESSON_CHECKOUT_SLOT_UNAVAILABLE_AFTER_PAYMENT_CODE,
          result.enrollmentId,
        );
      }
      if (result.paymentStatus === EPaymentStatus.SUCCEEDED) {
        return `${frontend}${ROUTES.CHECKOUT.SUBSCRIPTION_PLAN_SUCCESS(result.enrollmentId)}`;
      }
      const code = mapVnpayResponseToLessonCancelCode(
        result.responseCode,
        result.transactionStatus
      );
      return toSubCancel(code, result.enrollmentId);
    } catch (e) {
      if (e instanceof NotFoundException) {
        return toSubCancel('order_not_found');
      }
      if (e instanceof BadRequestException) {
        return toSubCancel('gateway_error');
      }
      throw e;
    }
  }

  async handleVnpayReturn(query: VnpayQuery) {
    const verification = this.vnpayService.verifyReturnUrl(query);
    if (!verification.isVerified) {
      throw new BadRequestException('Invalid VNPay return signature');
    }
    return this.applyVnpayPaymentResult(query);
  }

  async handleVnpayIpn(query: VnpayQuery) {
    const verification = this.vnpayService.verifyIpnCall(query);
    if (!verification.isVerified) {
      return { RspCode: '97', Message: 'Invalid checksum' };
    }

    const result = await this.applyVnpayPaymentResult(query);
    if (!result.updated) {
      return { RspCode: '00', Message: 'Already processed' };
    }
    return { RspCode: '00', Message: 'Confirm Success' };
  }

  private async applyVnpayPaymentResult(query: VnpayQuery): Promise<ApplyVnpayPaymentResult> {
    const txnRef = this.getScalarQueryValue(query.vnp_TxnRef);
    const responseCode = this.getScalarQueryValue(query.vnp_ResponseCode);
    const transactionStatus = this.getScalarQueryValue(query.vnp_TransactionStatus);

    if (!txnRef) {
      throw new BadRequestException('Missing vnp_TxnRef');
    }

    const booking = await this.prisma.trialLessonBooking.findFirst({
      where: { paymentRef: txnRef },
      select: {
        id: true,
        tutorId: true,
        studentId: true,
        paymentStatus: true,
        tutorAmount: true,
        deductAmount: true,
        tutor: {
          select: {
            userId: true,
          },
        },
      },
    });
    if (booking) {
      return this.applyTrialLessonVnpayPayment(query, booking, responseCode, transactionStatus);
    }

    const enrollment = await this.prisma.subscriptionEnrollment.findFirst({
      where: { paymentRef: txnRef },
      select: {
        id: true,
        studentId: true,
        tutorId: true,
        tutorAmount: true,
        deductAmount: true,
        paymentStatus: true,
        tutor: {
          select: {
            userId: true,
          },
        },
      },
    });
    if (enrollment) {
      return this.applySubscriptionEnrollmentVnpayPayment(
        query,
        enrollment,
        responseCode,
        transactionStatus
      );
    }

    throw new NotFoundException(`Payment order not found for ref ${txnRef}`);
  }

  private async applyTrialLessonVnpayPayment(
    query: VnpayQuery,
    booking: {
      id: string;
      tutorId: string;
      studentId: string;
      paymentStatus: EPaymentStatus;
      tutorAmount: bigint;
      deductAmount: bigint;
      tutor: { userId: string };
    },
    responseCode: string | undefined,
    transactionStatus: string | undefined
  ): Promise<ApplyVnpayPaymentResult> {
    const isSucceeded = responseCode === '00' && (!transactionStatus || transactionStatus === '00');
    const now = new Date();
    const eventType = isSucceeded ? 'vnpay.payment.succeeded' : 'vnpay.payment.failed';
    const txnRef = this.getScalarQueryValue(query.vnp_TxnRef)!;

    const bookingSlot = await this.prisma.trialLessonBooking.findUnique({
      where: { id: booking.id },
      select: {
        startAt: true,
        durationMinutes: true,
        tutor: { select: { user: { select: { timezone: true } } } },
      },
    });

    let slotConflictOnSuccess = false;
    if (isSucceeded && bookingSlot) {
      const slotCheck = await this.trialLessonBookingService.checkTutorLessonSlotBookable(
        booking.tutorId,
        bookingSlot.startAt.toISOString(),
        bookingSlot.durationMinutes,
        bookingSlot.tutor.user?.timezone ?? 'UTC',
        { excludeTrialBookingId: booking.id }
      );
      slotConflictOnSuccess = !slotCheck.available;
    }

    const processed = await this.prisma.$transaction(async (tx) => {
      const webhookLog = await this.upsertWebhookLog(tx, {
        orderCode: txnRef,
        eventType,
        rawPayload: query,
        isProcessed: false,
      });

      const updateBookingResult = await tx.trialLessonBooking.updateMany({
        where: {
          id: booking.id,
          paymentStatus: EPaymentStatus.PENDING,
        },
        data:
          isSucceeded && slotConflictOnSuccess
            ? {
                paymentStatus: EPaymentStatus.SUCCEEDED,
                paidAt: now,
                failedAt: null,
                status: ETrialLessonStatus.CANCELLED,
                cancelReason: LESSON_CANCEL_REASON_SLOT_CONFLICT,
              }
            : isSucceeded
              ? {
                  paymentStatus: EPaymentStatus.SUCCEEDED,
                  paidAt: now,
                  failedAt: null,
                  status: ETrialLessonStatus.CONFIRMED,
                }
              : {
                  paymentStatus: EPaymentStatus.FAILED,
                  failedAt: now,
                  paidAt: null,
                  status: ETrialLessonStatus.CANCELLED,
                },
      });
      const didUpdateBooking = updateBookingResult.count > 0;

      if (didUpdateBooking && isSucceeded && !slotConflictOnSuccess) {
        if (booking.deductAmount > 0n) {
          await this.walletCheckoutService.debitStudentForTrialBooking(tx, {
            studentUserId: booking.studentId,
            bookingId: booking.id,
            deductAmount: booking.deductAmount,
          });
        }
        await this.walletCheckoutService.creditTutorForTrialBooking(tx, {
          tutorUserId: booking.tutor.userId,
          bookingId: booking.id,
          tutorAmount: booking.tutorAmount,
        });
      }

      await tx.webhookLog.update({
        where: { id: webhookLog.id },
        data: {
          rawPayload: query,
          isProcessed: true,
          processedAt: now,
        },
      });

      const bookingAfter = await tx.trialLessonBooking.findUnique({
        where: { id: booking.id },
        select: {
          id: true,
          paymentStatus: true,
          status: true,
        },
      });
      if (!bookingAfter) {
        throw new NotFoundException(`Booking not found for id ${booking.id}`);
      }

      return {
        booking: bookingAfter,
        updated: didUpdateBooking,
        slotConflictOnSuccess,
      };
    });

    if (processed.updated && isSucceeded && processed.slotConflictOnSuccess) {
      await this.trialLessonBookingService.refundPaidBookingDueToSlotConflict(booking.id);
    } else if (processed.updated && isSucceeded) {
      await this.notificationService.notifyStudentBookingConfirmed({
        studentId: booking.studentId,
        bookingId: booking.id,
        tutorProfileId: booking.tutorId,
      });
      await this.lessonSettlementService.scheduleTrialLessonSettlement(booking.id);
    }

    const bookingAfterRefund = await this.prisma.trialLessonBooking.findUnique({
      where: { id: booking.id },
      select: {
        paymentStatus: true,
        status: true,
        cancelReason: true,
      },
    });

    const slotConflictAfterPayment =
      processed.slotConflictOnSuccess ||
      bookingAfterRefund?.cancelReason === LESSON_CANCEL_REASON_SLOT_CONFLICT;

    return {
      kind: 'trial',
      updated: processed.updated,
      bookingId: processed.booking.id,
      paymentStatus: bookingAfterRefund?.paymentStatus ?? processed.booking.paymentStatus,
      status: bookingAfterRefund?.status ?? processed.booking.status,
      slotConflictAfterPayment,
      responseCode,
      transactionStatus,
    };
  }

  private async applySubscriptionEnrollmentVnpayPayment(
    query: VnpayQuery,
    enrollment: {
      id: string;
      studentId: string;
      tutorId: string;
      tutorAmount: bigint;
      deductAmount: bigint;
      paymentStatus: EPaymentStatus;
      tutor: { userId: string };
    },
    responseCode: string | undefined,
    transactionStatus: string | undefined
  ): Promise<ApplyVnpayPaymentResult> {
    const isSucceeded = responseCode === '00' && (!transactionStatus || transactionStatus === '00');
    const now = new Date();
    const eventType = isSucceeded ? 'vnpay.payment.succeeded' : 'vnpay.payment.failed';
    const txnRef = this.getScalarQueryValue(query.vnp_TxnRef)!;

    const enrollmentSlots = await this.prisma.subscriptionEnrollment.findUnique({
      where: { id: enrollment.id },
      select: {
        weeklySlots: true,
        tutor: { select: { user: { select: { timezone: true } } } },
      },
    });

    let slotConflictOnSuccess = false;
    if (isSucceeded && enrollmentSlots) {
      const slotsCheck =
        await this.trialLessonBookingService.checkSubscriptionEnrollmentSlotsBookable(
          enrollment.id,
          enrollment.tutorId,
          enrollment.studentId,
          enrollmentSlots.weeklySlots,
        );
      slotConflictOnSuccess = !slotsCheck.available;
    }

    const processed = await this.prisma.$transaction(async (tx) => {
      const webhookLog = await this.upsertWebhookLog(tx, {
        orderCode: txnRef,
        eventType,
        rawPayload: query,
        isProcessed: false,
      });

      const updateEnrollmentResult = await tx.subscriptionEnrollment.updateMany({
        where: {
          id: enrollment.id,
          paymentStatus: EPaymentStatus.PENDING,
        },
        data:
          isSucceeded && slotConflictOnSuccess
            ? {
                paymentStatus: EPaymentStatus.SUCCEEDED,
                paidAt: now,
                failedAt: null,
                status: ESubscriptionEnrollmentStatus.CANCELLED,
              }
            : isSucceeded
              ? {
                  paymentStatus: EPaymentStatus.SUCCEEDED,
                  paidAt: now,
                  failedAt: null,
                  status: ESubscriptionEnrollmentStatus.ACTIVE,
                }
              : {
                  paymentStatus: EPaymentStatus.FAILED,
                  failedAt: now,
                  paidAt: null,
                  status: ESubscriptionEnrollmentStatus.CANCELLED,
                },
      });
      const didUpdateEnrollment = updateEnrollmentResult.count > 0;

      if (didUpdateEnrollment && isSucceeded && !slotConflictOnSuccess) {
        if (enrollment.deductAmount > 0n) {
          await this.walletCheckoutService.debitStudentForSubscriptionEnrollment(tx, {
            studentUserId: enrollment.studentId,
            enrollmentId: enrollment.id,
            deductAmount: enrollment.deductAmount,
          });
        }
        await this.walletCheckoutService.creditTutorForSubscriptionEnrollment(tx, {
          tutorUserId: enrollment.tutor.userId,
          enrollmentId: enrollment.id,
          tutorAmount: enrollment.tutorAmount,
        });
      }

      await tx.webhookLog.update({
        where: { id: webhookLog.id },
        data: {
          rawPayload: query,
          isProcessed: true,
          processedAt: now,
        },
      });

      const enrollmentAfter = await tx.subscriptionEnrollment.findUnique({
        where: { id: enrollment.id },
        select: {
          id: true,
          paymentStatus: true,
          status: true,
        },
      });
      if (!enrollmentAfter) {
        throw new NotFoundException(`Subscription enrollment not found for id ${enrollment.id}`);
      }

      return {
        enrollment: enrollmentAfter,
        updated: didUpdateEnrollment,
        slotConflictOnSuccess,
      };
    });

    if (processed.updated && isSucceeded && processed.slotConflictOnSuccess) {
      await this.trialLessonBookingService.refundPaidSubscriptionEnrollmentDueToSlotConflict(
        enrollment.id,
      );
    } else if (processed.updated && isSucceeded) {
      await this.notificationService.notifySubscriptionEnrollmentConfirmed({
        enrollmentId: enrollment.id,
        studentId: enrollment.studentId,
        tutorProfileId: enrollment.tutorId,
      });
      await this.lessonSettlementService.scheduleSubscriptionEnrollmentSettlements(
        enrollment.id
      );
    }

    const enrollmentAfterRefund = await this.prisma.subscriptionEnrollment.findUnique({
      where: { id: enrollment.id },
      select: {
        paymentStatus: true,
        status: true,
      },
    });

    const slotConflictAfterPayment =
      processed.slotConflictOnSuccess ||
      (enrollmentAfterRefund?.paymentStatus === EPaymentStatus.REFUNDED &&
        enrollmentAfterRefund?.status === ESubscriptionEnrollmentStatus.CANCELLED);

    return {
      kind: 'subscription',
      updated: processed.updated,
      enrollmentId: processed.enrollment.id,
      paymentStatus:
        enrollmentAfterRefund?.paymentStatus ?? processed.enrollment.paymentStatus,
      status: enrollmentAfterRefund?.status ?? processed.enrollment.status,
      slotConflictAfterPayment,
      responseCode,
      transactionStatus,
    };
  }

  private getScalarQueryValue(value: string | string[] | undefined): string | undefined {
    if (Array.isArray(value)) {
      return value[0];
    }
    return value;
  }

  private async upsertWebhookLog(
    tx: Prisma.TransactionClient,
    payload: {
      orderCode: string;
      eventType: string;
      rawPayload: VnpayQuery;
      isProcessed: boolean;
      processedAt?: Date;
    }
  ) {
    const existing = await tx.webhookLog.findFirst({
      where: {
        orderCode: payload.orderCode,
        eventType: payload.eventType,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      await tx.webhookLog.update({
        where: { id: existing.id },
        data: {
          rawPayload: payload.rawPayload,
          isProcessed: payload.isProcessed,
          processedAt: payload.processedAt ?? null,
        },
      });
      return existing;
    }

    return tx.webhookLog.create({
      data: {
        orderCode: payload.orderCode,
        eventType: payload.eventType,
        rawPayload: payload.rawPayload,
        isProcessed: payload.isProcessed,
        processedAt: payload.processedAt ?? null,
      },
    });
  }
}
