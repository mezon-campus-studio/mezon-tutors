import type { AdminTransactionsFilters } from "./admin-wallet.api";

export const adminWalletQueryKey = {
  all: ["admin-wallet"] as const,
  withdrawals: (page: number) =>
    [...adminWalletQueryKey.all, "withdrawals", page] as const,
  transactionStats: (tutorId?: string, startDate?: string, endDate?: string) =>
    [...adminWalletQueryKey.all, "transaction-stats", tutorId ?? "all", startDate ?? "", endDate ?? ""] as const,
  transactions: (
    page: number,
    filters: AdminTransactionsFilters = {},
  ) =>
    [
      ...adminWalletQueryKey.all,
      "transactions",
      page,
      filters.direction ?? "all",
      filters.startDate ?? "",
      filters.endDate ?? "",
      filters.tutorId ?? "",
    ] as const,
  userTransactions: (userId: string, page: number) =>
    [...adminWalletQueryKey.all, "user-transactions", userId, page] as const,
  tutors: (search: string) =>
    [...adminWalletQueryKey.all, "tutors", search] as const,
};
