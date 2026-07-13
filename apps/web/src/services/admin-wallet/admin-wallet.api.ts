"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AdminUserWalletTransactionsApiResponse,
  AdminWalletTransactionStatsApiResponse,
  AdminWalletTransactionsApiResponse,
  AdminWalletWithdrawalsApiResponse,
  ApiResponse,
  ApproveWalletWithdrawalAdminPayload,
  WalletTransactionDirection,
} from "@mezon-tutors/shared";
import { apiClient } from "../api-client";
import { adminWalletQueryKey } from "./admin-wallet.qkey";

const BASE = "/wallet";

export type AdminTransactionsFilters = {
  direction?: WalletTransactionDirection;
  startDate?: string;
  endDate?: string;
  tutorId?: string;
};

export type TutorSearchItem = {
  id: string;
  username: string;
  displayName: string;
  email: string | null;
};

export const adminWalletApi = {
  getWithdrawals(page: number): Promise<AdminWalletWithdrawalsApiResponse> {
    return apiClient.get<
      ApiResponse<AdminWalletWithdrawalsApiResponse>,
      AdminWalletWithdrawalsApiResponse
    >(`${BASE}/admin/withdrawals`, { params: { page, limit: 10 } });
  },

  getTransactionStats(tutorId?: string, startDate?: string, endDate?: string): Promise<AdminWalletTransactionStatsApiResponse> {
    const params: Record<string, string> = {};
    if (tutorId) params.tutorId = tutorId;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    return apiClient.get<
      ApiResponse<AdminWalletTransactionStatsApiResponse>,
      AdminWalletTransactionStatsApiResponse
    >(`${BASE}/admin/transactions/stats`, { params });
  },

  getTransactions(
    page: number,
    filters: AdminTransactionsFilters = {},
  ): Promise<AdminWalletTransactionsApiResponse> {
    const params: Record<string, string | number | undefined> = { page, limit: 15 };
    if (filters.direction) params.direction = filters.direction;
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    if (filters.tutorId) params.tutorId = filters.tutorId;
    return apiClient.get<
      ApiResponse<AdminWalletTransactionsApiResponse>,
      AdminWalletTransactionsApiResponse
    >(`${BASE}/admin/transactions`, { params });
  },

  getUserTransactions(
    userId: string,
    page: number,
  ): Promise<AdminUserWalletTransactionsApiResponse> {
    return apiClient.get<
      ApiResponse<AdminUserWalletTransactionsApiResponse>,
      AdminUserWalletTransactionsApiResponse
    >(`${BASE}/admin/transactions/user/${userId}`, {
      params: { page, limit: 10 },
    });
  },

  searchTutors(search?: string): Promise<TutorSearchItem[]> {
    return apiClient.get<
      ApiResponse<TutorSearchItem[]>,
      TutorSearchItem[]
    >(`${BASE}/admin/tutors`, { params: { search } });
  },

  approveWithdrawal(
    id: string,
    payload: ApproveWalletWithdrawalAdminPayload = {},
  ): Promise<void> {
    return apiClient.put(`${BASE}/withdrawals/${id}/approve`, payload);
  },

  rejectWithdrawal(id: string, adminNote?: string): Promise<void> {
    return apiClient.put(`${BASE}/withdrawals/${id}/reject`, { adminNote });
  },
};

export function useAdminWalletWithdrawals(page: number) {
  return useQuery({
    queryKey: adminWalletQueryKey.withdrawals(page),
    queryFn: () => adminWalletApi.getWithdrawals(page),
    staleTime: 30 * 1000,
  });
}

export function useAdminWalletTransactionStats(tutorId?: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: adminWalletQueryKey.transactionStats(tutorId, startDate, endDate),
    queryFn: () => adminWalletApi.getTransactionStats(tutorId, startDate, endDate),
    staleTime: 30 * 1000,
    placeholderData: (prev) => prev,
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
    placeholderData: (prev) => prev,
  });
}

export function useAdminUserTransactions(userId: string, page: number) {
  return useQuery({
    queryKey: adminWalletQueryKey.userTransactions(userId, page),
    queryFn: () => adminWalletApi.getUserTransactions(userId, page),
    staleTime: 30 * 1000,
  });
}

export function useSearchTutors(search: string) {
  return useQuery({
    queryKey: adminWalletQueryKey.tutors(search),
    queryFn: () => adminWalletApi.searchTutors(search || undefined),
    staleTime: 30 * 1000,
    enabled: true,
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
