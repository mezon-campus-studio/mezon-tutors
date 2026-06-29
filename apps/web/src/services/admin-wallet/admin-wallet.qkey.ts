export const adminWalletQueryKey = {
  all: ["admin-wallet"] as const,
  withdrawals: (page: number) =>
    [...adminWalletQueryKey.all, "withdrawals", page] as const,
  transactionStats: () =>
    [...adminWalletQueryKey.all, "transaction-stats"] as const,
  transactions: (
    page: number,
    filters: { direction?: string } = {},
  ) =>
    [
      ...adminWalletQueryKey.all,
      "transactions",
      page,
      filters.direction ?? "all",
    ] as const,
  userTransactions: (userId: string, page: number) =>
    [...adminWalletQueryKey.all, "user-transactions", userId, page] as const,
};
