"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AdminWalletTransactionStatsApiResponse,
  AdminWalletTransactionsApiResponse,
  AdminWalletWithdrawalsApiResponse,
  ApiResponse,
  ApproveWalletWithdrawalAdminPayload,
  WalletTransactionDirection,
  WalletTransactionType,
} from "@mezon-tutors/shared";
import { apiClient } from "../api-client";
import { adminWalletQueryKey } from "./admin-wallet.qkey";

const BASE = "/wallet";

export type AdminTransactionsFilters = {
  type?: WalletTransactionType;
  direction?: WalletTransactionDirection;
};

export const adminWalletApi = {
  getWithdrawals(page: number): Promise<AdminWalletWithdrawalsApiResponse> {
    return apiClient.get<
      ApiResponse<AdminWalletWithdrawalsApiResponse>,
      AdminWalletWithdrawalsApiResponse
    >(`${BASE}/admin/withdrawals`, { params: { page, limit: 10 } });
  },

  getTransactionStats(): Promise<AdminWalletTransactionStatsApiResponse> {
    return apiClient.get<
      ApiResponse<AdminWalletTransactionStatsApiResponse>,
      AdminWalletTransactionStatsApiResponse
    >(`${BASE}/admin/transactions/stats`);
  },

  getTransactions(
    page: number,
    filters: AdminTransactionsFilters = {},
  ): Promise<AdminWalletTransactionsApiResponse> {
    return apiClient.get<
      ApiResponse<AdminWalletTransactionsApiResponse>,
      AdminWalletTransactionsApiResponse
    >(`${BASE}/admin/transactions`, {
      params: { page, limit: 15, ...filters },
    });
  },

  approveWithdrawal(
    id: string,
    payload: ApproveWalletWithdrawalAdminPayload = {},
  ): Promise<void> {
    return apiClient.patch(`${BASE}/withdrawals/${id}/approve`, payload);
  },

  rejectWithdrawal(id: string, adminNote?: string): Promise<void> {
    return apiClient.patch(`${BASE}/withdrawals/${id}/reject`, { adminNote });
  },
};

export function useAdminWalletWithdrawals(page: number) {
  return useQuery({
    queryKey: adminWalletQueryKey.withdrawals(page),
    queryFn: () => adminWalletApi.getWithdrawals(page),
    staleTime: 30 * 1000,
  });
}

export function useAdminWalletTransactionStats() {
  return useQuery({
    queryKey: adminWalletQueryKey.transactionStats(),
    queryFn: () => adminWalletApi.getTransactionStats(),
    staleTime: 30 * 1000,
  });
}

export function useAdminWalletTransactions(
  page: number,
  filters: AdminTransactionsFilters = {},
) {
  return useQuery({
    queryKey: adminWalletQueryKey.transactions(page, filters),
    queryFn: () => adminWalletApi.getTransactions(page, filters),
    staleTime: 30 * 1000,
  });
}

export function useApproveWithdrawal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...payload
    }: { id: string } & ApproveWalletWithdrawalAdminPayload) =>
      adminWalletApi.approveWithdrawal(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminWalletQueryKey.all });
    },
  });
}

export function useRejectWithdrawal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, adminNote }: { id: string; adminNote?: string }) =>
      adminWalletApi.rejectWithdrawal(id, adminNote),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminWalletQueryKey.all });
    },
  });
}
