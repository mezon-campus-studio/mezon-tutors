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
  ESubscriptionLessonSlotStatus,
  formatToCurrency,
  type CreateWalletWithdrawalPayload,
  type SubscriptionWeeklySlotDto,
  type StudentWalletStatsApiResponse,
  type TutorWalletStatsApiResponse,
  type UpdateWalletPayoutBankPayload,
  type WalletDetailsApiResponse,
  type WalletPayoutBankAccount,
  type WalletStatsApiResponse,
  type WalletTransactionApiItem,
  type WalletTransactionLessonDetail,
  type WalletTransactionsApiResponse,
  type WalletWithdrawalApiItem,
  type WalletWithdrawalsApiResponse,
  type AdminWalletWithdrawalApiItem,
  type AdminWalletWithdrawalsApiResponse,
  type AdminWalletTransactionApiItem,
  type AdminWalletTransactionsApiResponse,
  type AdminWalletTransactionStatsApiResponse,
  ECurrency as SharedCurrency,
  DEFAULT_TIMEZONE,
  WITHDRAWAL_WINDOW_CLOSED_CODE,
  isWithdrawalWindowOpen,
  subscriptionConcreteOccurrencesSorted,
  subscriptionSlotGrossAmount,
  subscriptionSlotPlatformFee,
  subscriptionSlotTutorAmount,
  formatTutorDisplayName,
} from '@mezon-tutors/shared';
import dayjs = require('dayjs');
import { PrismaService } from '../../prisma/prisma.service';
import {
  transactionEconomicsData,
  transactionEconomicsFromAmount,
  transactionEconomicsFromGrossTutorFee,
} from './transaction-economics';
import type { TransactionEconomicsFields } from './transaction-economics';
import { NotificationService } from '../notification/notification.service';
import { AppSettingsService } from '../app-settings/app-settings.service';

const WALLET_TUTOR_PROFILE_SELECT = {
  firstName: true,
  lastName: true,
  user: { select: { username: true, avatar: true } },
} as const;

type WalletTutorProfileSnapshot = {
  firstName?: string | null;
  lastName?: string | null;
  user?: { username?: string | null; avatar?: string | null } | null;
};

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly appSettingsService: AppSettingsService,
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

  private formatWalletTutorName(tutor?: WalletTutorProfileSnapshot | null): string {
    if (!tutor) {
      return 'Tutor';
    }
    return formatTutorDisplayName({
      firstName: tutor.firstName,
      lastName: tutor.lastName,
      username: tutor.user?.username,
    });
  }

  private formatWalletTutorAvatar(tutor?: WalletTutorProfileSnapshot | null): string | null {
    return tutor?.user?.avatar ?? null;
  }

  private formatWithdrawalRequesterName(user: {
    role: Role;
    username: string;
    tutorProfile?: { firstName: string; lastName: string } | null;
  }): string {
    if (user.role === Role.TUTOR) {
      return formatTutorDisplayName({
        firstName: user.tutorProfile?.firstName,
        lastName: user.tutorProfile?.lastName,
        username: user.username,
      });
    }

    return user.username?.trim() || 'A student';
  }

  private parseWeeklySlots(value: Prisma.JsonValue): SubscriptionWeeklySlotDto[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value as unknown as SubscriptionWeeklySlotDto[];
  }

  private resolveTransactionPlatformFee(params: {
    booking: { platformFee: bigint } | null;
    subscriptionEnrollment: {
      platformFee: bigint;
      weeklySlots: Prisma.JsonValue;
    } | null;
    subscriptionSlotIndex: number | null;
  }): number | null {
    if (params.booking) {
      const fee = params.booking.platformFee;
      return fee > 0n ? Number(fee) : null;
    }

    if (params.subscriptionEnrollment) {
      const feeTotal = params.subscriptionEnrollment.platformFee;
      if (feeTotal <= 0n) {
        return null;
      }
      if (params.subscriptionSlotIndex == null) {
        return Number(feeTotal);
      }
      const slots = this.parseWeeklySlots(params.subscriptionEnrollment.weeklySlots);
      if (slots.length === 0) {
        return Number(feeTotal);
      }
      const slotFee = subscriptionSlotTutorAmount(
        feeTotal,
        slots.length,
        params.subscriptionSlotIndex,
      );
      return slotFee > 0n ? Number(slotFee) : null;
    }

    return null;
  }

  private assertWalletRole(role: Role) {
    if (role !== Role.TUTOR && role !== Role.STUDENT) {
      throw new ForbiddenException('Wallet is only available for students and tutors');
    }
  }

  private async requireWalletRole(userId: string): Promise<Role> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      throw new ForbiddenException('Unauthorized');
    }

    this.assertWalletRole(user.role);
    return user.role;
  }

  async getDetails(userId: string): Promise<WalletDetailsApiResponse> {
    const role = await this.requireWalletRole(userId);
    if (role === Role.TUTOR) {
      return this.getTutorDetails(userId);
    }
    return this.getStudentDetails(userId);
  }

  async getStats(userId: string): Promise<WalletStatsApiResponse> {
    const role = await this.requireWalletRole(userId);
    if (role === Role.TUTOR) {
      return this.getTutorStats(userId);
    }
    return this.getStudentStats(userId);
  }

  private normalizePayoutBankPayload(payload: UpdateWalletPayoutBankPayload) {
    return {
      bankName: payload.bankName.trim(),
      bankAccountNumber: payload.bankAccountNumber.trim(),
      bankAccountName: payload.bankAccountName.trim(),
    };
  }

  private mapWalletPayoutBank(
    wallet: {
      payoutBankName: string | null;
      payoutBankAccountNumber: string | null;
      payoutBankAccountName: string | null;
    } | null,
  ): WalletPayoutBankAccount | null {
    if (
      !wallet?.payoutBankName ||
      !wallet.payoutBankAccountNumber ||
      !wallet.payoutBankAccountName
    ) {
      return null;
    }
    return {
      bankName: wallet.payoutBankName,
      bankAccountNumber: wallet.payoutBankAccountNumber,
      bankAccountName: wallet.payoutBankAccountName,
    };
  }

  private async ensureWallet(userId: string) {
    return this.prisma.wallet.findUniqueOrThrow({
      where: { userId },
    });
  }

  private activeWithdrawalStatuses(): EWithdrawalStatus[] {
    return [EWithdrawalStatus.PENDING, EWithdrawalStatus.APPROVED, EWithdrawalStatus.PROCESSING];
  }

  private mapWithdrawalRow(row: {
    id: string;
    userId: string;
    walletId: string;
    amount: bigint;
    bankName: string;
    bankAccountNumber: string;
    bankAccountName: string;
    status: EWithdrawalStatus;
    adminNote: string | null;
    paymentProofUrl: string | null;
    paymentProofPublicId: string | null;
    createdAt: Date;
    processedAt: Date | null;
  }): WalletWithdrawalApiItem {
    return {
      id: row.id,
      userId: row.userId,
      walletId: row.walletId,
      amount: Number(row.amount),
      bankName: row.bankName,
      bankAccountNumber: row.bankAccountNumber,
      bankAccountName: row.bankAccountName,
      status: row.status,
      adminNote: row.adminNote,
      paymentProofUrl: row.paymentProofUrl,
      paymentProofPublicId: row.paymentProofPublicId,
      createdAt: row.createdAt.toISOString(),
      processedAt: row.processedAt?.toISOString() ?? null,
    };
  }

  private async getTutorDetails(userId: string): Promise<WalletDetailsApiResponse> {
    const [wallet, user] = await Promise.all([
      this.ensureWallet(userId),
      this.prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } }),
    ]);
    const payoutBankAccount = this.mapWalletPayoutBank(wallet);

    return {
      role: Role.TUTOR,
      currency: ECurrency.VND,
      availableBalance: Number(wallet.balance),
      pendingBalance: Number(wallet.pendingBalance),
      pendingWithdrawal: Number(wallet.pendingWithdrawal),
      totalEarned: Number(wallet.totalEarned),
      totalWithdrawn: Number(wallet.totalWithdrawn),
      payoutBankAccount,
      withdrawalWindowOpen: isWithdrawalWindowOpen(new Date(), user?.timezone),
    };
  }

  async updatePayoutBank(
    userId: string,
    payload: UpdateWalletPayoutBankPayload,
  ): Promise<WalletPayoutBankAccount> {
    await this.requireWalletRole(userId);
    const bank = this.normalizePayoutBankPayload(payload);

    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    const updated = await this.prisma.wallet.update({
      where: { userId },
      data: {
        payoutBankName: bank.bankName,
        payoutBankAccountNumber: bank.bankAccountNumber,
        payoutBankAccountName: bank.bankAccountName,
      },
    });

    return this.mapWalletPayoutBank(updated)!;
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
    const [wallet, paymentTotals, user] = await Promise.all([
      this.ensureWallet(userId),
      this.getStudentPaymentTotals(userId),
      this.prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } }),
    ]);
    const walletBalance = Number(wallet.balance);
    const payoutBankAccount = this.mapWalletPayoutBank(wallet);

    return {
      role: Role.STUDENT,
      currency: ECurrency.VND,
      hasWallet: true,
      walletBalance,
      availableBalance: walletBalance,
      pendingBalance: paymentTotals.pendingAmount,
      pendingWithdrawal: Number(wallet.pendingWithdrawal),
      totalEarned: Number(wallet.totalEarned),
      totalWithdrawn: Number(wallet.totalWithdrawn),
      totalSpent: paymentTotals.totalSpent,
      payoutBankAccount,
      withdrawalWindowOpen: isWithdrawalWindowOpen(new Date(), user?.timezone),
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
        monthRefunded: 0,
        totalRefunded: 0,
        monthWithdrawn: 0,
        totalWithdrawn: 0,
        transactionCount: 0,
      };
    }

    const [monthReceivedAgg, monthRefundedAgg, monthWithdrawnAgg, totalRefundedAgg, transactionCount] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: {
          walletId: wallet.id,
          createdAt: { gte: monthStart },
          direction: EWalletTransactionDirection.CREDIT,
          type: EWalletTransactionType.BOOKING_PAYMENT,
        },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          walletId: wallet.id,
          createdAt: { gte: monthStart },
          direction: EWalletTransactionDirection.DEBIT,
          type: EWalletTransactionType.REFUND,
        },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          walletId: wallet.id,
          createdAt: { gte: monthStart },
          direction: EWalletTransactionDirection.DEBIT,
          type: EWalletTransactionType.WITHDRAWAL,
        },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          walletId: wallet.id,
          direction: EWalletTransactionDirection.DEBIT,
          type: EWalletTransactionType.REFUND,
        },
        _sum: { amount: true },
      }),
      this.prisma.transaction.count({ where: { walletId: wallet.id } }),
    ]);

    return {
      role: Role.TUTOR,
      monthReceived: Number(monthReceivedAgg._sum.amount ?? 0n),
      totalReceived: Number(wallet.totalEarned),
      monthRefunded: Number(monthRefundedAgg._sum.amount ?? 0n),
      totalRefunded: Number(totalRefundedAgg._sum.amount ?? 0n),
      monthWithdrawn: Number(monthWithdrawnAgg._sum.amount ?? 0n),
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
    page = 1,
    limit = 10
  ): Promise<WalletTransactionsApiResponse> {
    const role = await this.requireWalletRole(userId);
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
          booking: {
            select: {
              id: true,
              startAt: true,
              durationMinutes: true,
              platformFee: true,
              student: { select: { username: true, avatar: true } },
            },
          },
          subscriptionEnrollment: {
            select: {
              id: true,
              weeklySlots: true,
              platformFee: true,
              student: { select: { username: true, avatar: true } },
            },
          },
        },
      }),
    ]);

    const items: WalletTransactionApiItem[] = rows.map((row) => {
      const isIncome =
        row.direction === EWalletTransactionDirection.CREDIT &&
        (row.type === EWalletTransactionType.RELEASE ||
          row.type === EWalletTransactionType.BOOKING_PAYMENT);
      const isCancellationDeduction =
        row.direction === EWalletTransactionDirection.DEBIT &&
        row.type === EWalletTransactionType.REFUND;

      let lessonDetail: WalletTransactionLessonDetail | null = null;
      if (isIncome || isCancellationDeduction) {
        if (row.booking) {
          lessonDetail = {
            lessonKind: 'trial',
            studentName: row.booking.student?.username ?? 'Student',
            studentAvatarUrl: row.booking.student?.avatar ?? null,
            startAt: row.booking.startAt.toISOString(),
            durationMinutes: row.booking.durationMinutes,
          };
        } else if (row.subscriptionEnrollment) {
          const slots = this.parseWeeklySlots(row.subscriptionEnrollment.weeklySlots);
          const slotIndex = row.subscriptionSlotIndex ?? 0;
          const slot = slots[slotIndex] ?? slots[0];
          const occurrences = subscriptionConcreteOccurrencesSorted(slots, DEFAULT_TIMEZONE);
          const occ =
            occurrences.find((o) => o.slotIndex === slotIndex) ?? occurrences[0];
          if (slot) {
            lessonDetail = {
              lessonKind: 'subscription',
              studentName: row.subscriptionEnrollment.student?.username ?? 'Student',
              studentAvatarUrl: row.subscriptionEnrollment.student?.avatar ?? null,
              startAt: (occ?.startAt ?? row.createdAt).toISOString(),
              durationMinutes: slot.durationMinutes,
              slotIndex: row.subscriptionSlotIndex,
            };
          }
        }
      }

      const isStudentLessonPayment =
        row.type === EWalletTransactionType.BOOKING_PAYMENT &&
        row.direction === EWalletTransactionDirection.CREDIT;

      return {
        id: row.id,
        type: row.type,
        direction: row.direction,
        amount: Number(row.amount),
        platformFee: isStudentLessonPayment
          ? this.resolveTransactionPlatformFee({
              booking: row.booking,
              subscriptionEnrollment: row.subscriptionEnrollment,
              subscriptionSlotIndex: row.subscriptionSlotIndex,
            })
          : null,
        description: row.description,
        createdAt: row.createdAt.toISOString(),
        referenceLabel: row.bookingId
          ? `Booking ${row.bookingId.slice(0, 8)}`
          : row.subscriptionEnrollmentId
            ? `Plan ${row.subscriptionEnrollmentId.slice(0, 8)}`
            : null,
        lessonDetail,
      };
    });

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
          deductAmount: true,
          startAt: true,
          durationMinutes: true,
          paidAt: true,
          createdAt: true,
          updatedAt: true,
          student: { select: { username: true, avatar: true } },
          tutor: { select: WALLET_TUTOR_PROFILE_SELECT },
        },
      }),
      this.prisma.subscriptionEnrollment.findMany({
        where: { studentId: userId, paymentStatus: succeeded },
        select: {
          id: true,
          grossAmount: true,
          deductAmount: true,
          weeklySlots: true,
          paidAt: true,
          createdAt: true,
          updatedAt: true,
          student: { select: { username: true, avatar: true } },
          tutor: { select: WALLET_TUTOR_PROFILE_SELECT },
        },
      }),
      wallet
        ? this.prisma.transaction.findMany({
            where: { walletId: wallet.id },
            orderBy: { createdAt: 'desc' },
            include: {
              booking: {
                select: {
                  startAt: true,
                  durationMinutes: true,
                  student: { select: { username: true, avatar: true } },
                  tutor: { select: WALLET_TUTOR_PROFILE_SELECT },
                },
              },
              subscriptionEnrollment: {
                select: {
                  weeklySlots: true,
                  student: { select: { username: true, avatar: true } },
                  tutor: { select: WALLET_TUTOR_PROFILE_SELECT },
                },
              },
            },
          })
        : Promise.resolve([]),
    ]);

    const paymentItems: WalletTransactionApiItem[] = [];

    for (const b of trials) {
      const vnpayAmount = b.grossAmount - (b.deductAmount ?? 0n);
      if (vnpayAmount <= 0n) continue;
      paymentItems.push({
        id: `pay-trial-${b.id}`,
        type: 'LESSON_PAYMENT' as const,
        direction: EWalletTransactionDirection.DEBIT,
        amount: Number(vnpayAmount),
        description: null,
        createdAt: (b.paidAt ?? b.updatedAt ?? b.createdAt).toISOString(),
        referenceLabel: `Trial · ${this.formatWalletTutorName(b.tutor)}`,
      });
    }

    for (const e of subs) {
      const vnpayAmount = e.grossAmount - (e.deductAmount ?? 0n);
      if (vnpayAmount <= 0n) continue;
      paymentItems.push({
        id: `pay-sub-${e.id}`,
        type: 'SUBSCRIPTION_PAYMENT' as const,
        direction: 'DEBIT' as const,
        amount: Number(vnpayAmount),
        description: null,
        createdAt: (e.paidAt ?? e.updatedAt ?? e.createdAt).toISOString(),
        referenceLabel: `Plan · ${this.formatWalletTutorName(e.tutor)}`,
      });
    }

    const walletItems: WalletTransactionApiItem[] = walletRows.map((row) => {
      const tutorProfile =
        row.booking?.tutor ?? row.subscriptionEnrollment?.tutor ?? null;
      const tutorName = this.formatWalletTutorName(tutorProfile);
      let lessonDetail: WalletTransactionLessonDetail | null = null;
      if (row.booking) {
        lessonDetail = {
          lessonKind: 'trial',
          studentName: row.booking.student?.username ?? 'Student',
          studentAvatarUrl: row.booking.student?.avatar ?? null,
          tutorName,
          tutorAvatarUrl: this.formatWalletTutorAvatar(row.booking.tutor),
          startAt: row.booking.startAt.toISOString(),
          durationMinutes: row.booking.durationMinutes,
        };
      } else if (row.subscriptionEnrollment) {
        const slots = this.parseWeeklySlots(row.subscriptionEnrollment.weeklySlots);
        const slotIndex = row.subscriptionSlotIndex ?? 0;
        const slot = slots[slotIndex] ?? slots[0];
        const occurrences = subscriptionConcreteOccurrencesSorted(slots, DEFAULT_TIMEZONE);
        const occurrence = occurrences.find((o) => o.slotIndex === slotIndex) ?? occurrences[0];
        if (slot) {
          lessonDetail = {
            lessonKind: 'subscription',
            studentName: row.subscriptionEnrollment.student?.username ?? 'Student',
            studentAvatarUrl: row.subscriptionEnrollment.student?.avatar ?? null,
            tutorName,
            tutorAvatarUrl: this.formatWalletTutorAvatar(row.subscriptionEnrollment.tutor),
            startAt: (occurrence?.startAt ?? row.createdAt).toISOString(),
            durationMinutes: slot.durationMinutes,
            slotIndex: row.subscriptionSlotIndex,
          };
        }
      }
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
        lessonDetail,
      };
    });

    for (const item of paymentItems) {
      if (item.id.startsWith('pay-trial-')) {
        const bookingId = item.id.replace('pay-trial-', '');
        const booking = trials.find((b) => b.id === bookingId);
        if (booking) {
          item.lessonDetail = {
            lessonKind: 'trial',
            studentName: booking.student?.username ?? 'Student',
            studentAvatarUrl: booking.student?.avatar ?? null,
            tutorName: this.formatWalletTutorName(booking.tutor),
            tutorAvatarUrl: this.formatWalletTutorAvatar(booking.tutor),
            startAt: booking.startAt.toISOString(),
            durationMinutes: booking.durationMinutes,
          };
        }
      } else if (item.id.startsWith('pay-sub-')) {
        const enrollmentId = item.id.replace('pay-sub-', '');
        const enrollment = subs.find((e) => e.id === enrollmentId);
        if (enrollment) {
          const slots = this.parseWeeklySlots(enrollment.weeklySlots);
          const slot = slots[0];
          const occurrences = subscriptionConcreteOccurrencesSorted(slots, DEFAULT_TIMEZONE);
          const firstOccurrence = occurrences[0];
          if (slot) {
            item.lessonDetail = {
              lessonKind: 'subscription',
              studentName: enrollment.student?.username ?? 'Student',
              studentAvatarUrl: enrollment.student?.avatar ?? null,
              tutorName: this.formatWalletTutorName(enrollment.tutor),
              tutorAvatarUrl: this.formatWalletTutorAvatar(enrollment.tutor),
              startAt: (firstOccurrence?.startAt ?? enrollment.createdAt).toISOString(),
              durationMinutes: slot.durationMinutes,
              slotIndex: firstOccurrence?.slotIndex ?? 0,
            };
          }
        }
      }
    }

    const merged = [...paymentItems, ...walletItems].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const total = merged.length;
    const items = merged.slice(skip, skip + safeLimit);

    return { items, meta: this.buildMeta(total, safePage, safeLimit) };
  }

  private async debitTutorForStudentLessonRefund(
    tx: Prisma.TransactionClient,
    params: {
      tutorUserId: string;
      tutorAmount: bigint;
      bookingId?: string;
      subscriptionEnrollmentId?: string;
      subscriptionSlotIndex?: number;
      description: string;
      economics: TransactionEconomicsFields;
    },
  ): Promise<void> {
    if (params.tutorAmount <= 0n) {
      return;
    }

    const tutorWallet = await tx.wallet.findUnique({
      where: { userId: params.tutorUserId },
    });
    if (!tutorWallet) {
      return;
    }

    const pendingDecrement =
      tutorWallet.pendingBalance >= params.tutorAmount
        ? params.tutorAmount
        : tutorWallet.pendingBalance;
    if (pendingDecrement <= 0n) {
      return;
    }

    await tx.wallet.update({
      where: { id: tutorWallet.id },
      data: {
        pendingBalance: { decrement: pendingDecrement },
        totalEarned: { decrement: pendingDecrement },
      },
    });

    await tx.transaction.create({
      data: {
        walletId: tutorWallet.id,
        bookingId: params.bookingId,
        subscriptionEnrollmentId: params.subscriptionEnrollmentId,
        subscriptionSlotIndex: params.subscriptionSlotIndex,
        type: EWalletTransactionType.REFUND,
        direction: EWalletTransactionDirection.DEBIT,
        amount: pendingDecrement,
        ...transactionEconomicsData(params.economics),
        description: params.description,
      },
    });
  }

  async creditStudentRefund(params: {
    studentUserId: string;
    amount: bigint;
    bookingId?: string;
    subscriptionEnrollmentId?: string;
    description?: string;
    economics?: TransactionEconomicsFields;
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
          ...transactionEconomicsData(
            params.economics ?? transactionEconomicsFromAmount(params.amount),
          ),
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
              firstName: true,
              lastName: true,
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

      const tutorLabel = this.formatWalletTutorName(booking.tutor);
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
          ...transactionEconomicsFromGrossTutorFee(
            booking.grossAmount,
            booking.tutorAmount,
            booking.platformFee,
          ),
          description: refundDescription,
        },
      });

      await this.debitTutorForStudentLessonRefund(tx, {
        tutorUserId: booking.tutor.userId,
        tutorAmount: booking.tutorAmount,
        bookingId: booking.id,
        description: `Deduction for cancelled trial lesson refund to student`,
        economics: transactionEconomicsFromGrossTutorFee(
          booking.grossAmount,
          booking.tutorAmount,
          booking.platformFee,
        ),
      });

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
    platformFee: bigint;
    slotCount: number;
    description?: string;
  }): Promise<boolean> {
    const enrollment = await this.prisma.subscriptionEnrollment.findUnique({
      where: { id: params.enrollmentId },
      select: { weeklySlots: true },
    });
    if (!enrollment) {
      return false;
    }
    const slots = this.parseWeeklySlots(enrollment.weeklySlots);
    const slot = slots[params.slotIndex];
    if (!slot) {
      return false;
    }
    if (slot.status === ESubscriptionLessonSlotStatus.REFUNDED) {
      return true;
    }

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
    const slotEconomics = transactionEconomicsFromGrossTutorFee(
      refundAmount,
      tutorPendingDecrement,
      subscriptionSlotPlatformFee(params.platformFee, params.slotCount, params.slotIndex),
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
          ...transactionEconomicsData(slotEconomics),
          description: params.description ?? 'Refund for cancelled subscription lesson',
        },
      });

      await this.debitTutorForStudentLessonRefund(tx, {
        tutorUserId: params.tutorUserId,
        tutorAmount: tutorPendingDecrement,
        subscriptionEnrollmentId: params.enrollmentId,
        subscriptionSlotIndex: params.slotIndex,
        description:
          params.description != null
            ? `Tutor deduction: ${params.description}`
            : 'Deduction for cancelled subscription lesson refund to student',
        economics: slotEconomics,
      });

      const updatedSlots = slots.map((s, i) =>
        i === params.slotIndex ? { ...s, status: ESubscriptionLessonSlotStatus.REFUNDED } : s
      );
      await tx.subscriptionEnrollment.update({
        where: { id: params.enrollmentId },
        data: { weeklySlots: updatedSlots as unknown as Prisma.InputJsonValue },
      });
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
        tutorAmount: true,
        platformFee: true,
        paymentStatus: true,
        tutor: { select: WALLET_TUTOR_PROFILE_SELECT },
      },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }
    if (enrollment.paymentStatus !== EPaymentStatus.SUCCEEDED) {
      throw new BadRequestException('Only succeeded payments can be refunded to wallet');
    }

    const tutorLabel = this.formatWalletTutorName(enrollment.tutor);

    await this.creditStudentRefund({
      studentUserId: enrollment.studentId,
      amount: enrollment.grossAmount,
      subscriptionEnrollmentId: enrollment.id,
      description: `Refund for subscription plan with ${tutorLabel}`,
      economics: transactionEconomicsFromGrossTutorFee(
        enrollment.grossAmount,
        enrollment.tutorAmount,
        enrollment.platformFee,
      ),
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
    page = 1,
    limit = 10
  ): Promise<WalletWithdrawalsApiResponse> {
    await this.requireWalletRole(userId);

    const { skip, page: safePage, limit: safeLimit } = this.paginate(page, limit);
    const where: Prisma.WithdrawalWhereInput = { userId };

    const [total, rows] = await Promise.all([
      this.prisma.withdrawal.count({ where }),
      this.prisma.withdrawal.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
      }),
    ]);

    const items: WalletWithdrawalApiItem[] = rows.map((row) => this.mapWithdrawalRow(row));

    return { items, meta: this.buildMeta(total, safePage, safeLimit) };
  }

  async getAdminTransactionStats(): Promise<AdminWalletTransactionStatsApiResponse> {
    const where: Prisma.TransactionWhereInput = {
      type: { in: [EWalletTransactionType.BOOKING_PAYMENT, EWalletTransactionType.WITHDRAWAL] },
    };

    const monthStart = this.monthStart();
    const [
      creditAgg,
      debitAgg,
      platformFeeAgg,
      monthCreditAgg,
      monthDebitAgg,
      transactionCount,
      monthTransactionCount,
    ] = await Promise.all([
      this.prisma.transaction.aggregate({
        _sum: { grossAmount: true },
        where: { direction: EWalletTransactionDirection.CREDIT, ...where },
      }),
      this.prisma.transaction.aggregate({
        _sum: { grossAmount: true },
        where: { direction: EWalletTransactionDirection.DEBIT, ...where },
      }),
      this.prisma.transaction.aggregate({
        _sum: { platformFee: true },
        where: { ...where },
      }),
      this.prisma.transaction.aggregate({
        _sum: { grossAmount: true },
        where: {
          direction: EWalletTransactionDirection.CREDIT,
          createdAt: { gte: monthStart },
          ...where
        },
      }),
      this.prisma.transaction.aggregate({
        _sum: { grossAmount: true },
        where: {
          direction: EWalletTransactionDirection.DEBIT,
          createdAt: { gte: monthStart },
          ...where
        },
      }),
      this.prisma.transaction.count({ where }),
      this.prisma.transaction.count({ where: { createdAt: { gte: monthStart }, ...where } }),
    ]);

    return {
      totalCredit: Number(creditAgg._sum.grossAmount ?? 0n),
      totalDebit: Number(debitAgg._sum.grossAmount ?? 0n),
      totalPlatformFee: Number(platformFeeAgg._sum.platformFee ?? 0n),
      monthCredit: Number(monthCreditAgg._sum.grossAmount ?? 0n),
      monthDebit: Number(monthDebitAgg._sum.grossAmount ?? 0n),
      transactionCount,
      monthTransactionCount,
    };
  }

  async getAllTransactions(
    page = 1,
    limit = 15,
    direction?: EWalletTransactionDirection,
  ): Promise<AdminWalletTransactionsApiResponse> {
    const { skip, page: safePage, limit: safeLimit } = this.paginate(page, limit);

    const where: Prisma.TransactionWhereInput = {
      type: { in: [EWalletTransactionType.BOOKING_PAYMENT, EWalletTransactionType.WITHDRAWAL] },
      ...(direction ? { direction } : {}),
    };

    const [total, rows] = await Promise.all([
      this.prisma.transaction.count({ where }),
      this.prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
        include: {
          wallet: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                  role: true,
                  tutorProfile: { select: { firstName: true, lastName: true } },
                },
              },
            },
          },
          booking: { select: { id: true } },
          subscriptionEnrollment: { select: { id: true } },
        },
      }),
    ]);

    const items: AdminWalletTransactionApiItem[] = rows.map((row) => ({
      id: row.id,
      type: row.type,
      direction: row.direction,
      amount: Number(row.amount),
      grossAmount: row.grossAmount != null ? Number(row.grossAmount) : null,
      platformFee: row.platformFee != null ? Number(row.platformFee) : null,
      description: row.description,
      createdAt: row.createdAt.toISOString(),
      referenceLabel: row.bookingId
        ? `Booking ${row.bookingId.slice(0, 8)}`
        : row.subscriptionEnrollmentId
          ? `Plan ${row.subscriptionEnrollmentId.slice(0, 8)}`
          : row.withdrawalId
            ? `Withdrawal ${row.withdrawalId.slice(0, 8)}`
            : null,
      user: row.wallet.user
        ? {
            id: row.wallet.user.id,
            username: row.wallet.user.username,
            displayName: this.formatWithdrawalRequesterName(row.wallet.user),
            email: row.wallet.user.email,
            role: row.wallet.user.role as 'STUDENT' | 'TUTOR',
          }
        : undefined,
    }));

    return { items, meta: this.buildMeta(total, safePage, safeLimit) };
  }

  async getAllWithdrawals(page = 1, limit = 10): Promise<AdminWalletWithdrawalsApiResponse> {
    const { skip, page: safePage, limit: safeLimit } = this.paginate(page, limit);

    const [total, rows] = await Promise.all([
      this.prisma.withdrawal.count(),
      this.prisma.withdrawal.findMany({
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              tutorProfile: { select: { firstName: true, lastName: true } },
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
      }),
    ]);

    const items: AdminWalletWithdrawalApiItem[] = rows.map((row) => ({
      ...this.mapWithdrawalRow(row),
      user: row.user
        ? {
            id: row.user.id,
            username: row.user.username,
            displayName: this.formatWithdrawalRequesterName(row.user),
            email: row.user.email,
            role: row.user.role as 'STUDENT' | 'TUTOR',
          }
        : undefined,
    }));

    return { items, meta: this.buildMeta(total, safePage, safeLimit) };
  }

  private withdrawalRequesterRoleLabel(role: Role): string {
    return role === Role.STUDENT ? 'Student' : 'Tutor';
  }

  async createWithdrawal(
    userId: string,
    payload: CreateWalletWithdrawalPayload
  ): Promise<WalletWithdrawalApiItem> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        timezone: true,
        username: true,
        avatar: true,
        mezonUserId: true,
        tutorProfile: { select: { firstName: true, lastName: true } },
      },
    });

    if (!user) {
      throw new ForbiddenException('Unauthorized');
    }

    this.assertWalletRole(user.role);

    if (!isWithdrawalWindowOpen(new Date(), user.timezone)) {
      throw new BadRequestException(WITHDRAWAL_WINDOW_CLOSED_CODE);
    }

    const bankName = payload.bankName.trim();
    const bankAccountNumber = payload.bankAccountNumber.trim();
    const bankAccountName = payload.bankAccountName.trim();

    if (!bankName || !bankAccountNumber || !bankAccountName) {
      throw new BadRequestException('Payout bank account details are required');
    }

    const amount = BigInt(Math.round(payload.amount));
    const settings = await this.appSettingsService.getSettings();
    const minWithdrawal = BigInt(settings.minWithdrawalAmountVnd);
    if (amount < minWithdrawal) {
      throw new BadRequestException(
        `Minimum withdrawal amount is ${settings.minWithdrawalAmountVnd.toLocaleString('en-US')} VND`,
      );
    }

    const wallet = await this.ensureWallet(userId);

    if (wallet.balance < amount) {
      throw new BadRequestException('Insufficient available balance');
    }

    const pending = await this.prisma.withdrawal.count({
      where: {
        userId,
        status: { in: this.activeWithdrawalStatuses() },
      },
    });
    if (pending > 0) {
      throw new BadRequestException('You already have a pending withdrawal request');
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const withdrawal = await tx.withdrawal.create({
        data: {
          userId,
          walletId: wallet.id,
          amount,
          bankName,
          bankAccountNumber,
          bankAccountName,
          status: EWithdrawalStatus.PENDING,
        },
      });

      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { decrement: amount },
          pendingWithdrawal: { increment: amount },
          payoutBankName: bankName,
          payoutBankAccountNumber: bankAccountNumber,
          payoutBankAccountName: bankAccountName,
        },
      });

      return withdrawal;
    });

    const requesterName = this.formatWithdrawalRequesterName(user);
    const amountFormatted = formatToCurrency(SharedCurrency.VND, Number(created.amount));
    const requesterRole = this.withdrawalRequesterRoleLabel(user.role);

    try {
      await this.notificationService.notifyAdminWithdrawalRequested({
        withdrawalId: created.id,
        requesterName,
        requesterRole,
        amountFormatted,
        bankName: created.bankName,
        bankAccountNumber: created.bankAccountNumber,
        senderAvatarUrl: user.avatar,
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to notify admin for withdrawal ${created.id}: ${detail}`);
    }

    if (user.role === Role.STUDENT) {
      try {
        await this.notificationService.notifyStudentWithdrawalSubmitted({
          studentUserId: userId,
          studentMezonUserId: user.mezonUserId,
          withdrawalId: created.id,
          amountFormatted,
          bankName: created.bankName,
          bankAccountNumber: created.bankAccountNumber,
        });
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Failed to notify student for submitted withdrawal ${created.id}: ${detail}`);
      }
    }

    return this.mapWithdrawalRow(created);
  }

  async approveWithdrawal(
    withdrawalId: string,
    options?: {
      adminNote?: string;
      paymentProofUrl?: string;
      paymentProofPublicId?: string;
    },
  ): Promise<WalletWithdrawalApiItem> {
    const adminNote = options?.adminNote;
    const paymentProofUrl = options?.paymentProofUrl?.trim();
    const paymentProofPublicId = options?.paymentProofPublicId?.trim();

    const created = await this.prisma.$transaction(async (tx) => {
      const withdrawal = await tx.withdrawal.findUnique({
        where: { id: withdrawalId },
        include: { wallet: true },
      });

      if (!withdrawal) {
        throw new NotFoundException('Withdrawal not found');
      }

      if (!this.activeWithdrawalStatuses().includes(withdrawal.status)) {
        throw new BadRequestException('Withdrawal is not awaiting completion');
      }

      if (withdrawal.wallet.pendingWithdrawal < withdrawal.amount) {
        throw new BadRequestException('Pending withdrawal balance is insufficient');
      }

      await tx.wallet.update({
        where: { id: withdrawal.walletId },
        data: {
          pendingWithdrawal: { decrement: withdrawal.amount },
          totalWithdrawn: { increment: withdrawal.amount },
        },
      });

      await tx.transaction.create({
        data: {
          walletId: withdrawal.walletId,
          withdrawalId: withdrawal.id,
          type: EWalletTransactionType.WITHDRAWAL,
          direction: EWalletTransactionDirection.DEBIT,
          amount: withdrawal.amount,
          ...transactionEconomicsFromAmount(withdrawal.amount),
          description: `Withdrawal completed to ${withdrawal.bankName}`,
        },
      });

      return tx.withdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: EWithdrawalStatus.COMPLETED,
          processedAt: new Date(),
          ...(adminNote !== undefined ? { adminNote: adminNote.trim() || null } : {}),
          ...(paymentProofUrl ? { paymentProofUrl } : {}),
          ...(paymentProofPublicId ? { paymentProofPublicId } : {}),
        },
      });
    });

    const requester = await this.prisma.user.findUnique({
      where: { id: created.userId },
      select: { role: true, mezonUserId: true },
    });
    const amountFormatted = formatToCurrency(SharedCurrency.VND, Number(created.amount));

    try {
      if (requester?.role === Role.STUDENT) {
        await this.notificationService.notifyStudentWithdrawalCompleted({
          studentUserId: created.userId,
          studentMezonUserId: requester.mezonUserId,
          withdrawalId: created.id,
          amountFormatted,
          bankName: created.bankName,
          bankAccountNumber: created.bankAccountNumber,
        });
      } else {
        await this.notificationService.notifyTutorWithdrawalCompleted({
          tutorUserId: created.userId,
          tutorMezonUserId: requester?.mezonUserId,
          withdrawalId: created.id,
          amountFormatted,
          bankName: created.bankName,
          bankAccountNumber: created.bankAccountNumber,
        });
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to notify user for completed withdrawal ${created.id}: ${detail}`);
    }

    return this.mapWithdrawalRow(created);
  }

  async rejectWithdrawal(
    withdrawalId: string,
    adminNote?: string,
  ): Promise<WalletWithdrawalApiItem> {
    const created = await this.prisma.$transaction(async (tx) => {
      const withdrawal = await tx.withdrawal.findUnique({
        where: { id: withdrawalId },
        include: { wallet: true },
      });

      if (!withdrawal) {
        throw new NotFoundException('Withdrawal not found');
      }

      if (!this.activeWithdrawalStatuses().includes(withdrawal.status)) {
        throw new BadRequestException('Withdrawal cannot be rejected');
      }

      if (withdrawal.wallet.pendingWithdrawal < withdrawal.amount) {
        throw new BadRequestException('Pending withdrawal balance is insufficient');
      }

      await tx.wallet.update({
        where: { id: withdrawal.walletId },
        data: {
          balance: { increment: withdrawal.amount },
          pendingWithdrawal: { decrement: withdrawal.amount },
        },
      });

      return tx.withdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: EWithdrawalStatus.REJECTED,
          processedAt: new Date(),
          ...(adminNote !== undefined ? { adminNote: adminNote.trim() || null } : {}),
        },
      });
    });

    const requester = await this.prisma.user.findUnique({
      where: { id: created.userId },
      select: { role: true, mezonUserId: true },
    });
    const amountFormatted = formatToCurrency(SharedCurrency.VND, Number(created.amount));

    try {
      if (requester?.role === Role.STUDENT) {
        await this.notificationService.notifyStudentWithdrawalRejected({
          studentUserId: created.userId,
          studentMezonUserId: requester.mezonUserId,
          withdrawalId: created.id,
          amountFormatted,
          bankName: created.bankName,
          bankAccountNumber: created.bankAccountNumber,
          adminNote: created.adminNote,
        });
      } else {
        await this.notificationService.notifyTutorWithdrawalRejected({
          tutorUserId: created.userId,
          tutorMezonUserId: requester?.mezonUserId,
          withdrawalId: created.id,
          amountFormatted,
          bankName: created.bankName,
          bankAccountNumber: created.bankAccountNumber,
          adminNote: created.adminNote,
        });
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to notify user for rejected withdrawal ${created.id}: ${detail}`);
    }

    return this.mapWithdrawalRow(created);
  }
}
