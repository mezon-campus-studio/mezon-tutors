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
  mapPayosResponseToLessonCancelCode,
  mapVnpayResponseToLessonCancelCode,
  ROUTES,
  type LessonCheckoutCancelCode,
} from '@mezon-tutors/shared';
import type { Webhook } from '@payos/node/lib/resources/webhooks/webhook';
import { WebhookError } from '@payos/node';
import { PrismaService } from '../../prisma/prisma.service';
import { AppConfigService } from '../../shared/services/app-config.service';
import { LessonSettlementService } from '../lesson-settlement/lesson-settlement.service';
import { NotificationService } from '../notification/notification.service';
import { PayosService } from '../payos/payos.service';
import { VnpayService } from '../vnpay/vnpay.service';
import { WalletCheckoutService } from '../wallet/wallet-checkout.service';
import { TrialLessonBookingService } from '../trial-lesson-booking/trial-lesson-booking.service';
import { GoogleCalendarSyncService } from '../google-calendar/google-calendar-sync.service';

type VnpayQuery = Record<string, string | string[] | undefined>;
type PayosReturnQuery = Record<string, string | string[] | undefined>;
type PaymentGateway = 'vnpay' | 'payos';

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
    private readonly payosService: PayosService,
    private readonly appConfig: AppConfigService,
    private readonly notificationService: NotificationService,
    private readonly lessonSettlementService: LessonSettlementService,
    private readonly walletCheckoutService: WalletCheckoutService,
    private readonly trialLessonBookingService: TrialLessonBookingService,
    private readonly googleCalendarSyncService: GoogleCalendarSyncService,
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

  async buildTrialLessonPayosReturnRedirectUrl(query: PayosReturnQuery): Promise<string> {
    return this.buildPayosReturnRedirectUrl(query, 'trial');
  }

  async buildSubscriptionEnrollmentPayosReturnRedirectUrl(query: PayosReturnQuery): Promise<string> {
    return this.buildPayosReturnRedirectUrl(query, 'subscription');
  }

  async buildTrialLessonPayosCancelRedirectUrl(query: PayosReturnQuery): Promise<string> {
    return this.buildPayosCancelRedirectUrl(query, 'trial');
  }

  async buildSubscriptionEnrollmentPayosCancelRedirectUrl(query: PayosReturnQuery): Promise<string> {
    return this.buildPayosCancelRedirectUrl(query, 'subscription');
  }

  async handlePayosIpn(body: unknown) {
    const payload = body as Webhook;
    let verifiedData;
    try {
      verifiedData = await this.payosService.verifyWebhook(payload);
    } catch (error) {
      if (error instanceof WebhookError) {
        throw new BadRequestException('Invalid PayOS webhook signature');
      }
      throw error;
    }

    const paymentOk =
      payload.success === true &&
      payload.code === '00' &&
      verifiedData.code === '00' &&
      verifiedData.status === 'PAID';

    await this.applyPayosPaymentResult({
      orderRef: String(verifiedData.orderCode),
      isSucceeded: paymentOk,
      rawPayload: body,
      responseCode: payload.code,
      transactionStatus: verifiedData.status,
    });

    return { received: true };
  }

  private async buildPayosReturnRedirectUrl(
    query: PayosReturnQuery,
    checkout: 'trial' | 'subscription',
  ): Promise<string> {
    const frontend = this.appConfig.frontendUrl.replace(/\/$/, '');
    const toTrialCancel = (code: LessonCheckoutCancelCode, bookingId?: string) =>
      this.lessonCheckoutCancelUrl(frontend, 'trial', code, bookingId);
    const toSubCancel = (code: LessonCheckoutCancelCode, enrollmentId?: string) =>
      this.lessonCheckoutCancelUrl(frontend, 'subscription', code, enrollmentId);

    const orderCode = this.getScalarQueryValue(query.orderCode);
    const code = this.getScalarQueryValue(query.code);
    const status = this.getScalarQueryValue(query.status);
    const cancel = this.parsePayosCancelFlag(query.cancel);

    if (!orderCode) {
      return checkout === 'trial' ? toTrialCancel('invalid_signature') : toSubCancel('invalid_signature');
    }

    if (cancel) {
      return checkout === 'trial'
        ? toTrialCancel('user_cancelled')
        : toSubCancel('user_cancelled');
    }

    try {
      const isSucceeded = code === '00' && status === 'PAID';
      const result = await this.applyPayosPaymentResult({
        orderRef: orderCode,
        isSucceeded,
        rawPayload: query,
        responseCode: code,
        transactionStatus: status,
      });

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
        const cancelCode = mapPayosResponseToLessonCancelCode(code, cancel, status);
        return toSubCancel(cancelCode, result.enrollmentId);
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
      const cancelCode = mapPayosResponseToLessonCancelCode(code, cancel, status);
      return toTrialCancel(cancelCode, result.bookingId);
    } catch (e) {
      if (e instanceof NotFoundException) {
        return checkout === 'trial' ? toTrialCancel('order_not_found') : toSubCancel('order_not_found');
      }
      if (e instanceof BadRequestException) {
        return checkout === 'trial' ? toTrialCancel('gateway_error') : toSubCancel('gateway_error');
      }
      throw e;
    }
  }

  private buildPayosCancelRedirectUrl(
    query: PayosReturnQuery,
    checkout: 'trial' | 'subscription',
  ): string {
    const frontend = this.appConfig.frontendUrl.replace(/\/$/, '');
    const orderCode = this.getScalarQueryValue(query.orderCode);
    const code = this.getScalarQueryValue(query.code);
    const status = this.getScalarQueryValue(query.status);
    const cancelCode = mapPayosResponseToLessonCancelCode(code, true, status);

    if (orderCode) {
      void this.applyPayosPaymentResult({
        orderRef: orderCode,
        isSucceeded: false,
        rawPayload: query,
        responseCode: code,
        transactionStatus: status,
      }).catch(() => undefined);
    }

    return this.lessonCheckoutCancelUrl(frontend, checkout, cancelCode);
  }

  private async applyPayosPaymentResult(params: {
    orderRef: string;
    isSucceeded: boolean;
    rawPayload: unknown;
    responseCode?: string;
    transactionStatus?: string;
  }): Promise<ApplyVnpayPaymentResult> {
    const booking = await this.prisma.trialLessonBooking.findFirst({
      where: { paymentRef: params.orderRef },
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
      return this.applyTrialLessonGatewayPayment({
        gateway: 'payos',
        rawPayload: params.rawPayload,
        booking,
        isSucceeded: params.isSucceeded,
        responseCode: params.responseCode,
        transactionStatus: params.transactionStatus,
        orderRef: params.orderRef,
      });
    }

    const enrollment = await this.prisma.subscriptionEnrollment.findFirst({
      where: { paymentRef: params.orderRef },
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
      return this.applySubscriptionEnrollmentGatewayPayment({
        gateway: 'payos',
        rawPayload: params.rawPayload,
        enrollment,
        isSucceeded: params.isSucceeded,
        responseCode: params.responseCode,
        transactionStatus: params.transactionStatus,
        orderRef: params.orderRef,
      });
    }

    throw new NotFoundException(`Payment order not found for ref ${params.orderRef}`);
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
      return this.applyTrialLessonGatewayPayment({
        gateway: 'vnpay',
        rawPayload: query,
        booking,
        isSucceeded:
          responseCode === '00' && (!transactionStatus || transactionStatus === '00'),
        responseCode,
        transactionStatus,
        orderRef: txnRef,
      });
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
      return this.applySubscriptionEnrollmentGatewayPayment({
        gateway: 'vnpay',
        rawPayload: query,
        enrollment,
        isSucceeded:
          responseCode === '00' && (!transactionStatus || transactionStatus === '00'),
        responseCode,
        transactionStatus,
        orderRef: txnRef,
      });
    }

    throw new NotFoundException(`Payment order not found for ref ${txnRef}`);
  }

  private async applyTrialLessonGatewayPayment(params: {
    gateway: PaymentGateway;
    rawPayload: unknown;
    booking: {
      id: string;
      tutorId: string;
      studentId: string;
      paymentStatus: EPaymentStatus;
      tutorAmount: bigint;
      deductAmount: bigint;
      tutor: { userId: string };
    };
    isSucceeded: boolean;
    responseCode: string | undefined;
    transactionStatus: string | undefined;
    orderRef: string;
  }): Promise<ApplyVnpayPaymentResult> {
    const { gateway, rawPayload, booking, isSucceeded, responseCode, transactionStatus, orderRef } =
      params;
    const serializedPayload = this.toWebhookRawPayload(rawPayload);
    const now = new Date();
    const eventType = isSucceeded
      ? `${gateway}.payment.succeeded`
      : `${gateway}.payment.failed`;

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
        orderCode: orderRef,
        eventType,
        rawPayload: serializedPayload,
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
          rawPayload: serializedPayload,
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

    if (processed.updated) {
      this.googleCalendarSyncService.dispatchTrialBookingSync(booking.id);
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

  private async applySubscriptionEnrollmentGatewayPayment(params: {
    gateway: PaymentGateway;
    rawPayload: unknown;
    enrollment: {
      id: string;
      studentId: string;
      tutorId: string;
      tutorAmount: bigint;
      deductAmount: bigint;
      paymentStatus: EPaymentStatus;
      tutor: { userId: string };
    };
    isSucceeded: boolean;
    responseCode: string | undefined;
    transactionStatus: string | undefined;
    orderRef: string;
  }): Promise<ApplyVnpayPaymentResult> {
    const {
      gateway,
      rawPayload,
      enrollment,
      isSucceeded,
      responseCode,
      transactionStatus,
      orderRef,
    } = params;
    const serializedPayload = this.toWebhookRawPayload(rawPayload);
    const now = new Date();
    const eventType = isSucceeded
      ? `${gateway}.payment.succeeded`
      : `${gateway}.payment.failed`;

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
        orderCode: orderRef,
        eventType,
        rawPayload: serializedPayload,
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
          rawPayload: serializedPayload,
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

    if (processed.updated) {
      this.googleCalendarSyncService.dispatchSubscriptionEnrollmentSync(enrollment.id);
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

  private parsePayosCancelFlag(value: string | string[] | undefined): boolean {
    const raw = this.getScalarQueryValue(value)?.trim().toLowerCase();
    return raw === 'true' || raw === '1';
  }

  private toWebhookRawPayload(rawPayload: unknown): Prisma.InputJsonValue {
    return rawPayload as Prisma.InputJsonValue;
  }

  private async upsertWebhookLog(
    tx: Prisma.TransactionClient,
    payload: {
      orderCode: string;
      eventType: string;
      rawPayload: unknown;
      isProcessed: boolean;
      processedAt?: Date;
    }
  ) {
    const rawPayload = this.toWebhookRawPayload(payload.rawPayload);
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
          rawPayload,
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
        rawPayload,
        isProcessed: payload.isProcessed,
        processedAt: payload.processedAt ?? null,
      },
    });
  }
}
