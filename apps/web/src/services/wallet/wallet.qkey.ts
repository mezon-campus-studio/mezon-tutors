export const walletQueryKey = {
  all: ['wallet'] as const,
  detail: () => [...walletQueryKey.all, 'detail'] as const,
  stat: () => [...walletQueryKey.all, 'stat'] as const,
  transactions: (page: number) => [...walletQueryKey.all, 'transactions', page] as const,
  withdrawals: (page: number) => [...walletQueryKey.all, 'withdrawals', page] as const,
};
