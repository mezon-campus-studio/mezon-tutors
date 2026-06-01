"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AdminWalletWithdrawalsApiResponse,
  ApiResponse,
} from "@mezon-tutors/shared";
import { apiClient } from "../api-client";
import { adminWalletQueryKey } from "./admin-wallet.qkey";

const BASE = "/wallet";

export const adminWalletApi = {
  getWithdrawals(page: number): Promise<AdminWalletWithdrawalsApiResponse> {
    return apiClient.get<
      ApiResponse<AdminWalletWithdrawalsApiResponse>,
      AdminWalletWithdrawalsApiResponse
    >(`${BASE}/admin/withdrawals`, { params: { page, limit: 10 } });
  },

  approveWithdrawal(id: string, adminNote?: string): Promise<void> {
    return apiClient.patch(`${BASE}/withdrawals/${id}/approve`, { adminNote });
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

export function useApproveWithdrawal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, adminNote }: { id: string; adminNote?: string }) =>
      adminWalletApi.approveWithdrawal(id, adminNote),
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
