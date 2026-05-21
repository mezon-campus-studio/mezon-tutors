'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ApiResponse,
  CreateWalletWithdrawalPayload,
  WalletDetailsApiResponse,
  WalletStatsApiResponse,
  WalletTransactionsApiResponse,
  WalletWithdrawalsApiResponse,
} from '@mezon-tutors/shared';
import { useAtomValue } from 'jotai';
import { isLoadingAtom, userAtom } from '@/store';
import { apiClient } from '../api-client';
import { walletQueryKey } from './wallet.qkey';

const BASE = '/wallet';
const PAGE_SIZE = 10;

const walletQueryOptions = {
  staleTime: 60_000,
  retry: 1,
} as const;

const walletApi = {
  getDetail(): Promise<WalletDetailsApiResponse> {
    return apiClient.get<ApiResponse<WalletDetailsApiResponse>, WalletDetailsApiResponse>(
      `${BASE}/detail`,
    );
  },

  getStat(): Promise<WalletStatsApiResponse> {
    return apiClient.get<ApiResponse<WalletStatsApiResponse>, WalletStatsApiResponse>(
      `${BASE}/stat`,
    );
  },

  getTransactions(page: number): Promise<WalletTransactionsApiResponse> {
    return apiClient.get<
      ApiResponse<WalletTransactionsApiResponse>,
      WalletTransactionsApiResponse
    >(`${BASE}/transactions`, { params: { page, limit: PAGE_SIZE } });
  },

  getWithdrawals(page: number): Promise<WalletWithdrawalsApiResponse> {
    return apiClient.get<
      ApiResponse<WalletWithdrawalsApiResponse>,
      WalletWithdrawalsApiResponse
    >(`${BASE}/withdrawals`, { params: { page, limit: PAGE_SIZE } });
  },

  createWithdrawal(payload: CreateWalletWithdrawalPayload): Promise<void> {
    return apiClient.post(`${BASE}/withdrawals`, payload);
  },
};

function useWalletQueryEnabled() {
  const user = useAtomValue(userAtom);
  const isAuthLoading = useAtomValue(isLoadingAtom);
  return !isAuthLoading && Boolean(user);
}

export function useWalletDetails() {
  const enabled = useWalletQueryEnabled();
  return useQuery({
    queryKey: walletQueryKey.detail(),
    queryFn: () => walletApi.getDetail(),
    enabled,
    ...walletQueryOptions,
  });
}

export function useWalletStats() {
  const enabled = useWalletQueryEnabled();
  return useQuery({
    queryKey: walletQueryKey.stat(),
    queryFn: () => walletApi.getStat(),
    enabled,
    ...walletQueryOptions,
  });
}

export function useWalletTransactions(page: number) {
  const enabled = useWalletQueryEnabled();
  return useQuery({
    queryKey: walletQueryKey.transactions(page),
    queryFn: () => walletApi.getTransactions(page),
    enabled,
    ...walletQueryOptions,
  });
}

export function useWalletWithdrawals(page: number, tabEnabled: boolean) {
  const enabled = useWalletQueryEnabled() && tabEnabled;
  return useQuery({
    queryKey: walletQueryKey.withdrawals(page),
    queryFn: () => walletApi.getWithdrawals(page),
    enabled,
    ...walletQueryOptions,
  });
}

export function useCreateWalletWithdrawal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateWalletWithdrawalPayload) => walletApi.createWithdrawal(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: walletQueryKey.all });
    },
  });
}
