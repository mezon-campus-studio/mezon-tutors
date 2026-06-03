import { BadRequestException, Injectable } from '@nestjs/common';
import {
  ECurrency,
  EWalletTransactionDirection,
  EWalletTransactionType,
  Prisma,
} from '@mezon-tutors/db';
import { computeWalletPaymentSplitBigInt } from '@mezon-tutors/shared';
import { PrismaService } from '../../prisma/prisma.service';

export type ResolvedWalletCheckoutSplit = {
  deductAmount: bigint;
  vnpayAmount: bigint;
};

@Injectable()
export class WalletCheckoutService {
  constructor(private readonly prisma: PrismaService) {}

  async getStudentWalletBalance(studentUserId: string): Promise<bigint> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId: studentUserId },
      select: { balance: true },
    });
    return wallet?.balance ?? 0n;
  }

  resolveWalletCheckoutSplit(params: {
    grossAmount: bigint;
    walletBalance: bigint;
    useWalletBalance: boolean;
    currency: ECurrency;
  }): ResolvedWalletCheckoutSplit {
    const useWallet =
      params.useWalletBalance &&
      params.currency === ECurrency.VND &&
      params.walletBalance > 0n;

    const split = computeWalletPaymentSplitBigInt(
      params.grossAmount,
      params.walletBalance,
      useWallet,
    );

    if (split.deductFromWallet + split.vnpayAmount !== params.grossAmount) {
      throw new BadRequestException('Invalid wallet payment split');
    }

    return {
      deductAmount: split.deductFromWallet,
      vnpayAmount: split.vnpayAmount,
    };
  }

  assertSufficientWalletBalance(walletBalance: bigint, deductAmount: bigint): void {
    if (deductAmount > walletBalance) {
      throw new BadRequestException('Insufficient wallet balance for this payment');
    }
  }

  async debitStudentForTrialBooking(
    tx: Prisma.TransactionClient,
    params: {
      studentUserId: string;
      bookingId: string;
      deductAmount: bigint;
    },
  ): Promise<void> {
    if (params.deductAmount <= 0n) {
      return;
    }

    const wallet = await tx.wallet.findUnique({
      where: { userId: params.studentUserId },
    });
    if (!wallet || wallet.balance < params.deductAmount) {
      throw new BadRequestException('Insufficient wallet balance for this payment');
    }

    await tx.wallet.update({
      where: { id: wallet.id },
      data: { balance: { decrement: params.deductAmount } },
    });

    await tx.transaction.create({
      data: {
        walletId: wallet.id,
        bookingId: params.bookingId,
        type: EWalletTransactionType.BOOKING_PAYMENT,
        direction: EWalletTransactionDirection.DEBIT,
        amount: params.deductAmount,
        description: `Trial lesson payment from wallet for booking ${params.bookingId}`,
      },
    });
  }

  async debitStudentForSubscriptionEnrollment(
    tx: Prisma.TransactionClient,
    params: {
      studentUserId: string;
      enrollmentId: string;
      deductAmount: bigint;
    },
  ): Promise<void> {
    if (params.deductAmount <= 0n) {
      return;
    }

    const wallet = await tx.wallet.findUnique({
      where: { userId: params.studentUserId },
    });
    if (!wallet || wallet.balance < params.deductAmount) {
      throw new BadRequestException('Insufficient wallet balance for this payment');
    }

    await tx.wallet.update({
      where: { id: wallet.id },
      data: { balance: { decrement: params.deductAmount } },
    });

    await tx.transaction.create({
      data: {
        walletId: wallet.id,
        subscriptionEnrollmentId: params.enrollmentId,
        type: EWalletTransactionType.BOOKING_PAYMENT,
        direction: EWalletTransactionDirection.DEBIT,
        amount: params.deductAmount,
        description: `Subscription payment from wallet for enrollment ${params.enrollmentId}`,
      },
    });
  }

  async creditTutorForTrialBooking(
    tx: Prisma.TransactionClient,
    params: {
      tutorUserId: string;
      bookingId: string;
      tutorAmount: bigint;
    },
  ): Promise<void> {
    if (params.tutorAmount <= 0n) {
      return;
    }

    const wallet = await tx.wallet.upsert({
      where: { userId: params.tutorUserId },
      update: {
        pendingBalance: { increment: params.tutorAmount },
        totalEarned: { increment: params.tutorAmount },
      },
      create: {
        userId: params.tutorUserId,
        balance: 0n,
        pendingBalance: params.tutorAmount,
        totalEarned: params.tutorAmount,
        totalWithdrawn: 0n,
      },
      select: { id: true },
    });

    await tx.transaction.create({
      data: {
        walletId: wallet.id,
        bookingId: params.bookingId,
        type: EWalletTransactionType.BOOKING_PAYMENT,
        direction: EWalletTransactionDirection.CREDIT,
        amount: params.tutorAmount,
        description: `Trial lesson payment settled for booking ${params.bookingId}`,
      },
    });
  }

  async creditTutorForSubscriptionEnrollment(
    tx: Prisma.TransactionClient,
    params: {
      tutorUserId: string;
      enrollmentId: string;
      tutorAmount: bigint;
    },
  ): Promise<void> {
    if (params.tutorAmount <= 0n) {
      return;
    }

    const wallet = await tx.wallet.upsert({
      where: { userId: params.tutorUserId },
      update: {
        pendingBalance: { increment: params.tutorAmount },
        totalEarned: { increment: params.tutorAmount },
      },
      create: {
        userId: params.tutorUserId,
        balance: 0n,
        pendingBalance: params.tutorAmount,
        totalEarned: params.tutorAmount,
        totalWithdrawn: 0n,
      },
      select: { id: true },
    });

    await tx.transaction.create({
      data: {
        walletId: wallet.id,
        subscriptionEnrollmentId: params.enrollmentId,
        type: EWalletTransactionType.BOOKING_PAYMENT,
        direction: EWalletTransactionDirection.CREDIT,
        amount: params.tutorAmount,
        description: `Subscription enrollment payment settled for ${params.enrollmentId}`,
      },
    });
  }
}
