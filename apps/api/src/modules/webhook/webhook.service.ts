import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  EPaymentStatus,
  ESubscriptionEnrollmentStatus,
  ETrialLessonStatus,
  EWalletTransactionDirection,
  EWalletTransactionType,
  Prisma,
} from '@mezon-tutors/db';
import {
  mapVnpayResponseToTrialLessonCancelCode,
  ROUTES,
  type TrialLessonCheckoutCancelCode,
} from '@mezon-tutors/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { AppConfigService } from '../../shared/services/app-config.service';
import { NotificationService } from '../notification/notification.service';
import { VnpayService } from '../vnpay/vnpay.service';

type VnpayQuery = Record<string, string | string[] | undefined>;

export type ApplyVnpayPaymentResult =
  | {
      kind: 'trial';
      updated: boolean;
      bookingId: string;
      paymentStatus: EPaymentStatus;
      status: ETrialLessonStatus;
      responseCode: string | undefined;
      transactionStatus: string | undefined;
    }
  | {
      kind: 'subscription';
      updated: boolean;
      enrollmentId: string;
      paymentStatus: EPaymentStatus;
      status: ESubscriptionEnrollmentStatus;
      responseCode: string | undefined;
      transactionStatus: string | undefined;
    };

@Injectable()
export class WebhookService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vnpayService: VnpayService,
    private readonly appConfig: AppConfigService,
    private readonly notificationService: NotificationService
  ) {}

  async buildTrialLessonVnpayReturnRedirectUrl(query: VnpayQuery): Promise<string> {
    const frontend = this.appConfig.frontendUrl.replace(/\/$/, '');
    const toTrialCancel = (code: TrialLessonCheckoutCancelCode) =>
      `${frontend}${ROUTES.CHECKOUT.TRIAL_LESSON_CANCEL_WITH_CODE(code)}`;
    const toSubCancel = (code: TrialLessonCheckoutCancelCode) =>
      `${frontend}${ROUTES.CHECKOUT.SUBSCRIPTION_PLAN_CANCEL_WITH_CODE(code)}`;

    const verification = this.vnpayService.verifyReturnUrl(query);
    if (!verification.isVerified) {
      return toTrialCancel('invalid_signature');
    }

    try {
      const result = await this.applyVnpayPaymentResult(query);
      if (result.kind === 'subscription') {
        if (result.paymentStatus === EPaymentStatus.SUCCEEDED) {
          return `${frontend}${ROUTES.CHECKOUT.SUBSCRIPTION_PLAN_SUCCESS(result.enrollmentId)}`;
        }
        const code = mapVnpayResponseToTrialLessonCancelCode(
          result.responseCode,
          result.transactionStatus
        );
        return toSubCancel(code);
      }
      if (result.paymentStatus === EPaymentStatus.SUCCEEDED) {
        return `${frontend}${ROUTES.CHECKOUT.TRIAL_LESSON_SUCCESS(result.bookingId)}`;
      }
      const code = mapVnpayResponseToTrialLessonCancelCode(
        result.responseCode,
        result.transactionStatus
      );
      return toTrialCancel(code);
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
    const toSubCancel = (code: TrialLessonCheckoutCancelCode) =>
      `${frontend}${ROUTES.CHECKOUT.SUBSCRIPTION_PLAN_CANCEL_WITH_CODE(code)}`;
    const toTrialCancel = (code: TrialLessonCheckoutCancelCode) =>
      `${frontend}${ROUTES.CHECKOUT.TRIAL_LESSON_CANCEL_WITH_CODE(code)}`;

    const verification = this.vnpayService.verifyReturnUrl(query);
    if (!verification.isVerified) {
      return toSubCancel('invalid_signature');
    }

    try {
      const result = await this.applyVnpayPaymentResult(query);
      if (result.kind === 'trial') {
        if (result.paymentStatus === EPaymentStatus.SUCCEEDED) {
          return `${frontend}${ROUTES.CHECKOUT.TRIAL_LESSON_SUCCESS(result.bookingId)}`;
        }
        const code = mapVnpayResponseToTrialLessonCancelCode(
          result.responseCode,
          result.transactionStatus
        );
        return toTrialCancel(code);
      }
      if (result.paymentStatus === EPaymentStatus.SUCCEEDED) {
        return `${frontend}${ROUTES.CHECKOUT.SUBSCRIPTION_PLAN_SUCCESS(result.enrollmentId)}`;
      }
      const code = mapVnpayResponseToTrialLessonCancelCode(
        result.responseCode,
        result.transactionStatus
      );
      return toSubCancel(code);
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
        tutorId: true,
        tutorAmount: true,
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
      tutor: { userId: string };
    },
    responseCode: string | undefined,
    transactionStatus: string | undefined
  ): Promise<ApplyVnpayPaymentResult> {
    const isSucceeded = responseCode === '00' && (!transactionStatus || transactionStatus === '00');
    const now = new Date();
    const eventType = isSucceeded ? 'vnpay.payment.succeeded' : 'vnpay.payment.failed';
    const txnRef = this.getScalarQueryValue(query.vnp_TxnRef)!;

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
        data: isSucceeded
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

      if (didUpdateBooking && isSucceeded) {
        const tutorUserId = booking.tutor.userId;
        const wallet = await tx.wallet.upsert({
          where: { userId: tutorUserId },
          update: {
            pendingBalance: { increment: booking.tutorAmount },
            totalEarned: { increment: booking.tutorAmount },
          },
          create: {
            userId: tutorUserId,
            balance: 0n,
            pendingBalance: booking.tutorAmount,
            totalEarned: booking.tutorAmount,
            totalWithdrawn: 0n,
          },
          select: { id: true },
        });

        await tx.transaction.create({
          data: {
            walletId: wallet.id,
            bookingId: booking.id,
            type: EWalletTransactionType.BOOKING_PAYMENT,
            direction: EWalletTransactionDirection.CREDIT,
            amount: booking.tutorAmount,
            description: `Trial lesson payment settled for booking ${booking.id}`,
          },
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
      };
    });

    if (processed.updated && isSucceeded) {
      await this.notificationService.notifyStudentBookingConfirmed({
        studentId: booking.studentId,
        bookingId: booking.id,
        tutorProfileId: booking.tutorId,
      });
    }

    return {
      kind: 'trial',
      updated: processed.updated,
      bookingId: processed.booking.id,
      paymentStatus: processed.booking.paymentStatus,
      status: processed.booking.status,
      responseCode,
      transactionStatus,
    };
  }

  private async applySubscriptionEnrollmentVnpayPayment(
    query: VnpayQuery,
    enrollment: {
      id: string;
      tutorId: string;
      tutorAmount: bigint;
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
        data: isSucceeded
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

      if (didUpdateEnrollment && isSucceeded) {
        const tutorUserId = enrollment.tutor.userId;
        const wallet = await tx.wallet.upsert({
          where: { userId: tutorUserId },
          update: {
            pendingBalance: { increment: enrollment.tutorAmount },
            totalEarned: { increment: enrollment.tutorAmount },
          },
          create: {
            userId: tutorUserId,
            balance: 0n,
            pendingBalance: enrollment.tutorAmount,
            totalEarned: enrollment.tutorAmount,
            totalWithdrawn: 0n,
          },
          select: { id: true },
        });

        await tx.transaction.create({
          data: {
            walletId: wallet.id,
            subscriptionEnrollmentId: enrollment.id,
            type: EWalletTransactionType.BOOKING_PAYMENT,
            direction: EWalletTransactionDirection.CREDIT,
            amount: enrollment.tutorAmount,
            description: `Subscription enrollment payment settled for ${enrollment.id}`,
          },
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
      };
    });

    return {
      kind: 'subscription',
      updated: processed.updated,
      enrollmentId: processed.enrollment.id,
      paymentStatus: processed.enrollment.paymentStatus,
      status: processed.enrollment.status,
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
