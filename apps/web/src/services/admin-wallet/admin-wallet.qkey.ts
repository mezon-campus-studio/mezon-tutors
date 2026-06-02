export const adminWalletQueryKey = {
  all: ["admin-wallet"] as const,
  withdrawals: (page: number) =>
    [...adminWalletQueryKey.all, "withdrawals", page] as const,
};
