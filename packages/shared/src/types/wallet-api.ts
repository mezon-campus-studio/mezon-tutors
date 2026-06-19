import type { PaginatedData } from './api-response';

export type WalletTransactionType =
  | 'BOOKING_PAYMENT'
  | 'RELEASE'
  | 'WITHDRAWAL'
  | 'REFUND'
  | 'PLATFORM_FEE';

export type WalletTransactionDirection = 'CREDIT' | 'DEBIT';

export type WalletWithdrawalStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'REJECTED';

export type WalletPayoutBankAccount = {
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
};

export type WalletDetailsApiResponse = {
  role: 'STUDENT' | 'TUTOR';
  currency: 'VND';
  availableBalance: number;
  pendingBalance: number;
  pendingWithdrawal?: number;
  totalEarned: number;
  totalWithdrawn: number;
  totalSpent?: number;
  walletBalance?: number;
  hasWallet?: boolean;
  payoutBankAccount?: WalletPayoutBankAccount | null;
  withdrawalWindowOpen?: boolean;
};

export type StudentWalletStatsApiResponse = {
  role: 'STUDENT';
  monthSpent: number;
  totalSpent: number;
  monthRefunded: number;
  totalRefunded: number;
  transactionCount: number;
};

export type TutorWalletStatsApiResponse = {
  role: 'TUTOR';
  monthReceived: number;
  totalReceived: number;
  monthRefunded: number;
  totalRefunded: number;
  monthWithdrawn: number;
  totalWithdrawn: number;
  transactionCount: number;
};

export type WalletStatsApiResponse = StudentWalletStatsApiResponse | TutorWalletStatsApiResponse;

export function isStudentWalletStats(
  stats: WalletStatsApiResponse | undefined,
): stats is StudentWalletStatsApiResponse {
  return stats?.role === 'STUDENT';
}

export function isTutorWalletStats(
  stats: WalletStatsApiResponse | undefined,
): stats is TutorWalletStatsApiResponse {
  return stats?.role === 'TUTOR';
}

export type WalletTransactionLessonDetail = {
  lessonKind: 'trial' | 'subscription';
  studentName: string;
  studentAvatarUrl?: string | null;
  tutorName?: string | null;
  tutorAvatarUrl?: string | null;
  startAt: string;
  durationMinutes: number;
  slotIndex?: number | null;
};

export type WalletTransactionApiItem = {
  id: string;
  type: WalletTransactionType | 'LESSON_PAYMENT' | 'SUBSCRIPTION_PAYMENT';
  direction: WalletTransactionDirection;
  amount: number;
  platformFee?: number | null;
  description: string | null;
  createdAt: string;
  referenceLabel?: string | null;
  lessonDetail?: WalletTransactionLessonDetail | null;
};

export type WalletWithdrawalApiItem = {
  id: string;
  userId: string;
  walletId: string;
  amount: number;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  status: WalletWithdrawalStatus;
  adminNote: string | null;
  paymentProofUrl: string | null;
  paymentProofPublicId: string | null;
  createdAt: string;
  processedAt: string | null;
};

export type ApproveWalletWithdrawalAdminPayload = {
  adminNote?: string;
  paymentProofUrl?: string;
  paymentProofPublicId?: string;
};

export type AdminWalletWithdrawalApiItem = WalletWithdrawalApiItem & {
  user?: {
    id: string;
    username: string;
    displayName: string;
    email: string | null;
    role: 'STUDENT' | 'TUTOR';
  };
};

export type AdminWalletWithdrawalsApiResponse = PaginatedData<AdminWalletWithdrawalApiItem>;

export type AdminWalletTransactionApiItem = {
  id: string;
  type: WalletTransactionType;
  direction: WalletTransactionDirection;
  amount: number;
  grossAmount: number | null;
  platformFee: number | null;
  description: string | null;
  createdAt: string;
  referenceLabel?: string | null;
  user?: {
    id: string;
    username: string;
    displayName: string;
    email: string | null;
    role: 'STUDENT' | 'TUTOR';
  };
};

export type AdminWalletTransactionsApiResponse = PaginatedData<AdminWalletTransactionApiItem>;

export type AdminWalletTransactionStatsApiResponse = {
  totalCredit: number;
  totalDebit: number;
  totalPlatformFee: number;
  monthCredit: number;
  monthDebit: number;
  transactionCount: number;
  monthTransactionCount: number;
};

export type WalletTransactionsApiResponse = PaginatedData<WalletTransactionApiItem>;

export type WalletWithdrawalsApiResponse = PaginatedData<WalletWithdrawalApiItem>;

export type CreateWalletWithdrawalPayload = {
  amount: number;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
};

export type UpdateWalletPayoutBankPayload = {
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
};
