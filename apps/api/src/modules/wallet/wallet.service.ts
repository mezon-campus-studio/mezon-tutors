import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  ECurrency,
  EPaymentStatus,
  EWalletTransactionDirection,
  EWalletTransactionType,
  EWithdrawalStatus,
  Prisma,
  Role,
} from '@mezon-tutors/db';
import {
  ECurrency as SharedCurrency,
  formatToCurrency,
  type CreateWalletWithdrawalPayload,
  type StudentWalletStatsApiResponse,
  type TutorWalletStatsApiResponse,
  type WalletDetailsApiResponse,
  type WalletStatsApiResponse,
  type WalletTransactionApiItem,
  type WalletTransactionsApiResponse,
  type WalletWithdrawalApiItem,
  type WalletWithdrawalsApiResponse,
} from '@mezon-tutors/shared';
import {
  subscriptionSlotGrossAmount,
  subscriptionSlotTutorAmount,
} from '@mezon-tutors/shared';
import dayjs = require('dayjs');
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService
  ) {}

  private monthStart(): Date {
    return dayjs().startOf('month').toDate();
  }

  private studentSucceededPaymentInMonthWhere(userId: string, monthStart: Date) {
    return {
      studentId: userId,
      paymentStatus: EPaymentStatus.SUCCEEDED,
      OR: [
        { paidAt: { gte: monthStart } },
        {
          paidAt: null,
          OR: [{ updatedAt: { gte: monthStart } }, { createdAt: { gte: monthStart } }],
        },
      ],
    } satisfies Prisma.TrialLessonBookingWhereInput;
  }

  private paginate(page: number, limit: number) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(50, Math.max(1, limit));
    return {
      page: safePage,
      limit: safeLimit,
      skip: (safePage - 1) * safeLimit,
    };
  }

  private buildMeta(total: number, page: number, limit: number) {
    const totalPages = Math.max(1, Math.ceil(total / limit));
    return {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  private assertWalletRole(role: string) {
    if (role !== Role.TUTOR && role !== Role.STUDENT) {
      throw new ForbiddenException('Wallet is only available for students and tutors');
    }
  }

  async getDetails(userId: string, role: string): Promise<WalletDetailsApiResponse> {
    this.assertWalletRole(role);
    if (role === Role.TUTOR) {
      return this.getTutorDetails(userId);
    }
    return this.getStudentDetails(userId);
  }

  async getStats(userId: string, role: string): Promise<WalletStatsApiResponse> {
    this.assertWalletRole(role);
    if (role === Role.TUTOR) {
      return this.getTutorStats(userId);
    }
    return this.getStudentStats(userId);
  }

  private async getTutorDetails(userId: string): Promise<WalletDetailsApiResponse> {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });

    if (!wallet) {
      return {
        role: Role.TUTOR,
        currency: ECurrency.VND,
        availableBalance: 0,
        pendingBalance: 0,
        totalEarned: 0,
        totalWithdrawn: 0,
      };
    }

    return {
      role: Role.TUTOR,
      currency: ECurrency.VND,
      availableBalance: Number(wallet.balance),
      pendingBalance: Number(wallet.pendingBalance),
      totalEarned: Number(wallet.totalEarned),
      totalWithdrawn: Number(wallet.totalWithdrawn),
    };
  }

  private async getStudentPaymentTotals(userId: string) {
    const succeeded = EPaymentStatus.SUCCEEDED;

    const [trialSum, subSum, pendingTrial, pendingSub] = await Promise.all([
      this.prisma.trialLessonBooking.aggregate({
        where: { studentId: userId, paymentStatus: succeeded },
        _sum: { grossAmount: true },
      }),
      this.prisma.subscriptionEnrollment.aggregate({
        where: { studentId: userId, paymentStatus: succeeded },
        _sum: { grossAmount: true },
      }),
      this.prisma.trialLessonBooking.aggregate({
        where: { studentId: userId, paymentStatus: EPaymentStatus.PENDING },
        _sum: { grossAmount: true },
      }),
      this.prisma.subscriptionEnrollment.aggregate({
        where: { studentId: userId, paymentStatus: EPaymentStatus.PENDING },
        _sum: { grossAmount: true },
      }),
    ]);

    return {
      totalSpent: Number(trialSum._sum.grossAmount ?? 0n) + Number(subSum._sum.grossAmount ?? 0n),
      pendingAmount:
        Number(pendingTrial._sum.grossAmount ?? 0n) + Number(pendingSub._sum.grossAmount ?? 0n),
    };
  }

  private async getStudentDetails(userId: string): Promise<WalletDetailsApiResponse> {
    const [wallet, paymentTotals] = await Promise.all([
      this.prisma.wallet.findUnique({ where: { userId } }),
      this.getStudentPaymentTotals(userId),
    ]);
    const walletBalance = Number(wallet?.balance ?? 0n);

    return {
      role: Role.STUDENT,
      currency: ECurrency.VND,
      hasWallet: wallet != null,
      walletBalance,
      availableBalance: walletBalance,
      pendingBalance: paymentTotals.pendingAmount,
      totalEarned: Number(wallet?.totalEarned ?? 0n),
      totalWithdrawn: Number(wallet?.totalWithdrawn ?? 0n),
      totalSpent: paymentTotals.totalSpent,
    };
  }

  private sumByDirection(
    rows: { direction: EWalletTransactionDirection; _sum: { amount: bigint | null } }[],
    direction: EWalletTransactionDirection,
  ): number {
    return Number(rows.find((r) => r.direction === direction)?._sum.amount ?? 0n);
  }

  private async getTutorStats(userId: string): Promise<TutorWalletStatsApiResponse> {
    const monthStart = this.monthStart();
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });

    if (!wallet) {
      return {
        role: Role.TUTOR,
        monthReceived: 0,
        totalReceived: 0,
        monthWithdrawn: 0,
        totalWithdrawn: 0,
        transactionCount: 0,
      };
    }

    const [monthAgg, transactionCount] = await Promise.all([
      this.prisma.transaction.groupBy({
        by: ['direction'],
        where: { walletId: wallet.id, createdAt: { gte: monthStart } },
        _sum: { amount: true },
      }),
      this.prisma.transaction.count({ where: { walletId: wallet.id } }),
    ]);

    return {
      role: Role.TUTOR,
      monthReceived: this.sumByDirection(monthAgg, EWalletTransactionDirection.CREDIT),
      totalReceived: Number(wallet.totalEarned),
      monthWithdrawn: this.sumByDirection(monthAgg, EWalletTransactionDirection.DEBIT),
      totalWithdrawn: Number(wallet.totalWithdrawn),
      transactionCount,
    };
  }

  private async getStudentStats(userId: string): Promise<StudentWalletStatsApiResponse> {
    const monthStart = this.monthStart();
    const succeeded = EPaymentStatus.SUCCEEDED;
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });

    type WalletMonthDirectionAgg = {
      direction: EWalletTransactionDirection;
      _sum: { amount: bigint | null };
    };

    const [paymentTotals, trialCount, subCount, monthTrial, monthSub, walletMonthAgg, walletTxCount] =
      await Promise.all([
        this.getStudentPaymentTotals(userId),
        this.prisma.trialLessonBooking.count({
          where: { studentId: userId, paymentStatus: succeeded },
        }),
        this.prisma.subscriptionEnrollment.count({
          where: { studentId: userId, paymentStatus: succeeded },
        }),
        this.prisma.trialLessonBooking.aggregate({
          where: this.studentSucceededPaymentInMonthWhere(userId, monthStart),
          _sum: { grossAmount: true },
        }),
        this.prisma.subscriptionEnrollment.aggregate({
          where: this.studentSucceededPaymentInMonthWhere(userId, monthStart),
          _sum: { grossAmount: true },
        }),
        wallet
          ? this.prisma.transaction.groupBy({
              by: ['direction'],
              where: { walletId: wallet.id, createdAt: { gte: monthStart } },
              _sum: { amount: true },
            })
          : Promise.resolve([] as WalletMonthDirectionAgg[]),
        wallet
          ? this.prisma.transaction.count({ where: { walletId: wallet.id } })
          : Promise.resolve(0),
      ]);

    const monthSpent =
      Number(monthTrial._sum.grossAmount ?? 0n) + Number(monthSub._sum.grossAmount ?? 0n);
    const monthRefunded = this.sumByDirection(
      walletMonthAgg,
      EWalletTransactionDirection.CREDIT,
    );

    return {
      role: Role.STUDENT,
      monthSpent,
      totalSpent: paymentTotals.totalSpent,
      monthRefunded,
      totalRefunded: Number(wallet?.totalEarned ?? 0n),
      transactionCount: trialCount + subCount + walletTxCount,
    };
  }

  async getTransactions(
    userId: string,
    role: string,
    page = 1,
    limit = 10
  ): Promise<WalletTransactionsApiResponse> {
    this.assertWalletRole(role);
    if (role === Role.TUTOR) {
      return this.getTutorTransactions(userId, page, limit);
    }
    return this.getStudentPaymentHistory(userId, page, limit);
  }

  private async getTutorTransactions(
    userId: string,
    page: number,
    limit: number
  ): Promise<WalletTransactionsApiResponse> {
    const { skip, page: safePage, limit: safeLimit } = this.paginate(page, limit);
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) {
      return { items: [], meta: this.buildMeta(0, safePage, safeLimit) };
    }

    const [total, rows] = await Promise.all([
      this.prisma.transaction.count({ where: { walletId: wallet.id } }),
      this.prisma.transaction.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
        include: {
          booking: { select: { id: true } },
          subscriptionEnrollment: { select: { id: true } },
        },
      }),
    ]);

    const items: WalletTransactionApiItem[] = rows.map((row) => ({
      id: row.id,
      type: row.type,
      direction: row.direction,
      amount: Number(row.amount),
      description: row.description,
      createdAt: row.createdAt.toISOString(),
      referenceLabel: row.bookingId
        ? `Booking ${row.bookingId.slice(0, 8)}`
        : row.subscriptionEnrollmentId
          ? `Plan ${row.subscriptionEnrollmentId.slice(0, 8)}`
          : null,
    }));

    return { items, meta: this.buildMeta(total, safePage, safeLimit) };
  }

  private async getStudentPaymentHistory(
    userId: string,
    page: number,
    limit: number
  ): Promise<WalletTransactionsApiResponse> {
    const { skip, page: safePage, limit: safeLimit } = this.paginate(page, limit);
    const succeeded = EPaymentStatus.SUCCEEDED;

    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });

    const [trials, subs, walletRows] = await Promise.all([
      this.prisma.trialLessonBooking.findMany({
        where: { studentId: userId, paymentStatus: succeeded },
        select: {
          id: true,
          grossAmount: true,
          paidAt: true,
          createdAt: true,
          updatedAt: true,
          tutor: { select: { user: { select: { username: true } } } },
        },
      }),
      this.prisma.subscriptionEnrollment.findMany({
        where: { studentId: userId, paymentStatus: succeeded },
        select: {
          id: true,
          grossAmount: true,
          paidAt: true,
          createdAt: true,
          updatedAt: true,
          tutor: { select: { user: { select: { username: true } } } },
        },
      }),
      wallet
        ? this.prisma.transaction.findMany({
            where: { walletId: wallet.id },
            orderBy: { createdAt: 'desc' },
            include: {
              booking: {
                select: {
                  tutor: { select: { user: { select: { username: true } } } },
                },
              },
            },
          })
        : Promise.resolve([]),
    ]);

    const paymentItems: WalletTransactionApiItem[] = [
      ...trials.map((b) => ({
        id: `pay-trial-${b.id}`,
        type: 'LESSON_PAYMENT' as const,
        direction: EWalletTransactionDirection.DEBIT,
        amount: Number(b.grossAmount),
        description: null,
        createdAt: (b.paidAt ?? b.updatedAt ?? b.createdAt).toISOString(),
        referenceLabel: b.tutor.user.username ? `Trial · ${b.tutor.user.username}` : 'Trial lesson',
      })),
      ...subs.map((e) => ({
        id: `pay-sub-${e.id}`,
        type: 'SUBSCRIPTION_PAYMENT' as const,
        direction: 'DEBIT' as const,
        amount: Number(e.grossAmount),
        description: null,
        createdAt: (e.paidAt ?? e.updatedAt ?? e.createdAt).toISOString(),
        referenceLabel: e.tutor.user.username
          ? `Plan · ${e.tutor.user.username}`
          : 'Subscription plan',
      })),
    ];

    const walletItems: WalletTransactionApiItem[] = walletRows.map((row) => {
      const tutorName = row.booking?.tutor.user.username;
      return {
        id: row.id,
        type: row.type,
        direction: row.direction,
        amount: Number(row.amount),
        description: row.description,
        createdAt: row.createdAt.toISOString(),
        referenceLabel:
          row.type === EWalletTransactionType.REFUND
            ? tutorName
              ? `Refund · ${tutorName}`
              : 'Refund'
            : row.description,
      };
    });

    const merged = [...paymentItems, ...walletItems].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const total = merged.length;
    const items = merged.slice(skip, skip + safeLimit);

    return { items, meta: this.buildMeta(total, safePage, safeLimit) };
  }

  async creditStudentRefund(params: {
    studentUserId: string;
    amount: bigint;
    bookingId?: string;
    subscriptionEnrollmentId?: string;
    description?: string;
  }): Promise<void> {
    if (params.amount <= 0n) {
      return;
    }

    if (params.bookingId) {
      const existing = await this.prisma.transaction.findFirst({
        where: {
          bookingId: params.bookingId,
          type: EWalletTransactionType.REFUND,
        },
      });
      if (existing) {
        return;
      }
    }

    if (params.subscriptionEnrollmentId) {
      const existing = await this.prisma.transaction.findFirst({
        where: {
          subscriptionEnrollmentId: params.subscriptionEnrollmentId,
          type: EWalletTransactionType.REFUND,
        },
      });
      if (existing) {
        return;
      }
    }

    await this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.upsert({
        where: { userId: params.studentUserId },
        update: {
          balance: { increment: params.amount },
          totalEarned: { increment: params.amount },
        },
        create: {
          userId: params.studentUserId,
          balance: params.amount,
          pendingBalance: 0n,
          totalEarned: params.amount,
          totalWithdrawn: 0n,
        },
      });

      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          bookingId: params.bookingId,
          subscriptionEnrollmentId: params.subscriptionEnrollmentId,
          type: EWalletTransactionType.REFUND,
          direction: EWalletTransactionDirection.CREDIT,
          amount: params.amount,
          description: params.description ?? 'Refund to wallet balance',
        },
      });
    });
  }

  async refundTrialLessonBooking(
    bookingId: string,
    options?: { refundDescription?: string }
  ): Promise<boolean> {
    const existingRefund = await this.prisma.transaction.findFirst({
      where: {
        bookingId,
        type: EWalletTransactionType.REFUND,
      },
    });
    if (existingRefund) {
      await this.prisma.trialLessonBooking.updateMany({
        where: {
          id: bookingId,
          paymentStatus: { not: EPaymentStatus.REFUNDED },
        },
        data: {
          paymentStatus: EPaymentStatus.REFUNDED,
          refundedAt: new Date(),
        },
      });
      return true;
    }

    await this.prisma.$transaction(async (tx) => {
      const booking = await tx.trialLessonBooking.findUnique({
        where: { id: bookingId },
        include: {
          tutor: {
            select: {
              userId: true,
              user: { select: { username: true } },
            },
          },
        },
      });

      if (!booking) {
        throw new NotFoundException('Booking not found');
      }
      if (booking.paymentStatus === EPaymentStatus.REFUNDED) {
        return;
      }
      const isPaid =
        booking.paymentStatus === EPaymentStatus.SUCCEEDED || booking.paidAt != null;
      if (!isPaid || booking.paymentStatus === EPaymentStatus.FAILED) {
        throw new BadRequestException('Only paid trial lessons can be refunded to wallet');
      }
      if (booking.grossAmount <= 0n) {
        throw new BadRequestException('Invalid refund amount for this booking');
      }

      const tutorLabel = booking.tutor.user.username ?? 'tutor';
      const refundDescription =
        options?.refundDescription ?? `Refund for trial lesson with ${tutorLabel}`;

      const studentWallet = await tx.wallet.upsert({
        where: { userId: booking.studentId },
        update: {
          balance: { increment: booking.grossAmount },
          totalEarned: { increment: booking.grossAmount },
        },
        create: {
          userId: booking.studentId,
          balance: booking.grossAmount,
          pendingBalance: 0n,
          totalEarned: booking.grossAmount,
          totalWithdrawn: 0n,
        },
      });

      await tx.transaction.create({
        data: {
          walletId: studentWallet.id,
          bookingId: booking.id,
          type: EWalletTransactionType.REFUND,
          direction: EWalletTransactionDirection.CREDIT,
          amount: booking.grossAmount,
          description: refundDescription,
        },
      });

      const tutorWallet = await tx.wallet.findUnique({
        where: { userId: booking.tutor.userId },
      });
      if (tutorWallet && booking.tutorAmount > 0n) {
        const pendingDecrement =
          tutorWallet.pendingBalance >= booking.tutorAmount
            ? booking.tutorAmount
            : tutorWallet.pendingBalance;
        if (pendingDecrement > 0n) {
          await tx.wallet.update({
            where: { id: tutorWallet.id },
            data: {
              pendingBalance: { decrement: pendingDecrement },
              totalEarned: { decrement: pendingDecrement },
            },
          });
        }
      }

      await tx.trialLessonBooking.update({
        where: { id: booking.id },
        data: {
          paymentStatus: EPaymentStatus.REFUNDED,
          refundedAt: new Date(),
        },
      });
    });

    return true;
  }

  async refundSubscriptionLessonSlot(params: {
    enrollmentId: string;
    slotIndex: number;
    studentUserId: string;
    tutorUserId: string;
    grossAmount: bigint;
    tutorAmount: bigint;
    slotCount: number;
    description?: string;
  }): Promise<boolean> {
    const existingRefund = await this.prisma.transaction.findFirst({
      where: {
        subscriptionEnrollmentId: params.enrollmentId,
        subscriptionSlotIndex: params.slotIndex,
        type: EWalletTransactionType.REFUND,
      },
    });
    if (existingRefund) {
      return true;
    }

    const refundAmount = subscriptionSlotGrossAmount(
      params.grossAmount,
      params.slotCount,
      params.slotIndex
    );
    const tutorPendingDecrement = subscriptionSlotTutorAmount(
      params.tutorAmount,
      params.slotCount,
      params.slotIndex
    );

    if (refundAmount <= 0n) {
      return false;
    }

    await this.prisma.$transaction(async (tx) => {
      const studentWallet = await tx.wallet.upsert({
        where: { userId: params.studentUserId },
        update: {
          balance: { increment: refundAmount },
          totalEarned: { increment: refundAmount },
        },
        create: {
          userId: params.studentUserId,
          balance: refundAmount,
          pendingBalance: 0n,
          totalEarned: refundAmount,
          totalWithdrawn: 0n,
        },
      });

      await tx.transaction.create({
        data: {
          walletId: studentWallet.id,
          subscriptionEnrollmentId: params.enrollmentId,
          subscriptionSlotIndex: params.slotIndex,
          type: EWalletTransactionType.REFUND,
          direction: EWalletTransactionDirection.CREDIT,
          amount: refundAmount,
          description: params.description ?? 'Refund for cancelled subscription lesson',
        },
      });

      if (tutorPendingDecrement > 0n) {
        const tutorWallet = await tx.wallet.findUnique({
          where: { userId: params.tutorUserId },
        });
        if (tutorWallet) {
          const pendingDecrement =
            tutorWallet.pendingBalance >= tutorPendingDecrement
              ? tutorPendingDecrement
              : tutorWallet.pendingBalance;
          if (pendingDecrement > 0n) {
            await tx.wallet.update({
              where: { id: tutorWallet.id },
              data: {
                pendingBalance: { decrement: pendingDecrement },
                totalEarned: { decrement: pendingDecrement },
              },
            });
          }
        }
      }
    });

    return true;
  }

  async refundSubscriptionEnrollment(enrollmentId: string): Promise<void> {
    const enrollment = await this.prisma.subscriptionEnrollment.findUnique({
      where: { id: enrollmentId },
      select: {
        id: true,
        studentId: true,
        grossAmount: true,
        paymentStatus: true,
        tutor: { select: { user: { select: { username: true } } } },
      },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }
    if (enrollment.paymentStatus !== EPaymentStatus.SUCCEEDED) {
      throw new BadRequestException('Only succeeded payments can be refunded to wallet');
    }

    const tutorLabel = enrollment.tutor.user.username ?? 'tutor';

    await this.creditStudentRefund({
      studentUserId: enrollment.studentId,
      amount: enrollment.grossAmount,
      subscriptionEnrollmentId: enrollment.id,
      description: `Refund for subscription plan with ${tutorLabel}`,
    });

    await this.prisma.subscriptionEnrollment.update({
      where: { id: enrollment.id },
      data: {
        paymentStatus: EPaymentStatus.REFUNDED,
      },
    });
  }

  async getWithdrawals(
    userId: string,
    role: string,
    page = 1,
    limit = 10
  ): Promise<WalletWithdrawalsApiResponse> {
    if (role !== Role.TUTOR) {
      throw new ForbiddenException('Withdrawals are only available for tutors');
    }

    const { skip, page: safePage, limit: safeLimit } = this.paginate(page, limit);
    const where: Prisma.WithdrawalWhereInput = { tutorId: userId };

    const [total, rows] = await Promise.all([
      this.prisma.withdrawal.count({ where }),
      this.prisma.withdrawal.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
      }),
    ]);

    const items: WalletWithdrawalApiItem[] = rows.map((row) => ({
      id: row.id,
      amount: Number(row.amount),
      bankName: row.bankName,
      bankAccountNumber: row.bankAccountNumber,
      bankAccountName: row.bankAccountName,
      status: row.status,
      adminNote: row.adminNote,
      createdAt: row.createdAt.toISOString(),
      processedAt: row.processedAt?.toISOString() ?? null,
    }));

    return { items, meta: this.buildMeta(total, safePage, safeLimit) };
  }

  async createWithdrawal(
    userId: string,
    role: string,
    payload: CreateWalletWithdrawalPayload
  ): Promise<void> {
    if (role !== Role.TUTOR) {
      throw new ForbiddenException('Withdrawals are only available for tutors');
    }

    const amount = BigInt(Math.round(payload.amount));
    if (amount < 10_000n) {
      throw new BadRequestException('Minimum withdrawal amount is 10,000 VND');
    }

    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }
    if (wallet.balance < amount) {
      throw new BadRequestException('Insufficient available balance');
    }

    const pending = await this.prisma.withdrawal.count({
      where: {
        tutorId: userId,
        status: {
          in: [EWithdrawalStatus.PENDING, EWithdrawalStatus.APPROVED, EWithdrawalStatus.PROCESSING],
        },
      },
    });
    if (pending > 0) {
      throw new BadRequestException('You already have a pending withdrawal request');
    }

    const created = await this.prisma.withdrawal.create({
      data: {
        tutorId: userId,
        walletId: wallet.id,
        amount,
        bankName: payload.bankName.trim(),
        bankAccountNumber: payload.bankAccountNumber.trim(),
        bankAccountName: payload.bankAccountName.trim(),
        status: EWithdrawalStatus.PENDING,
      },
    });

    const tutor = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, avatar: true },
    });
    const tutorName = tutor?.username ?? 'A tutor';
    const amountFormatted = formatToCurrency(SharedCurrency.VND, Number(created.amount));

    try {
      await this.notificationService.notifyAdminWithdrawalRequested({
        withdrawalId: created.id,
        tutorName,
        amountFormatted,
        bankName: created.bankName,
        bankAccountNumber: created.bankAccountNumber,
        senderAvatarUrl: tutor?.avatar,
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to notify admin for withdrawal ${created.id}: ${detail}`);
    }
  }
}
