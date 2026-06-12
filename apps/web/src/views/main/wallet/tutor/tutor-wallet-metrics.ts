import type { WalletDetailsApiResponse, WalletStatsApiResponse } from '@mezon-tutors/shared';
import { isTutorWalletStats } from '@mezon-tutors/shared';

export type TutorWalletMetrics = {
  available: number;
  pendingRelease: number;
  pendingWithdrawal: number;
  withdrawable: number;
  monthReceived: number;
  monthWithdrawn: number;
  totalReceived: number;
  totalWithdrawn: number;
  transactionCount: number;
  canWithdraw: boolean;
};

export function getTutorWalletMetrics(
  details: WalletDetailsApiResponse | undefined,
  stats: WalletStatsApiResponse | undefined,
): TutorWalletMetrics {
  const tutorStats = isTutorWalletStats(stats) ? stats : undefined;
  const available = details?.availableBalance ?? 0;
  const pendingRelease = details?.pendingBalance ?? 0;
  const pendingWithdrawal = details?.pendingWithdrawal ?? 0;

  return {
    available: available + pendingWithdrawal,
    pendingRelease,
    pendingWithdrawal,
    withdrawable: available,
    monthReceived: tutorStats?.monthReceived ?? 0,
    monthWithdrawn: tutorStats?.monthWithdrawn ?? 0,
    totalReceived: tutorStats?.totalReceived ?? details?.totalEarned ?? 0,
    totalWithdrawn: tutorStats?.totalWithdrawn ?? details?.totalWithdrawn ?? 0,
    transactionCount: tutorStats?.transactionCount ?? 0,
    canWithdraw: available >= 10_000 && (details?.withdrawalWindowOpen ?? true),
  };
}

export function getTutorEarningsChartPercents(monthReceived: number, monthWithdrawn: number) {
  const total = Math.max(monthReceived + monthWithdrawn, 1);
  const receivedPct = Math.round((monthReceived / total) * 100);
  return { receivedPct, withdrawnPct: 100 - receivedPct };
}
