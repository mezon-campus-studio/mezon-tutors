export const PUBLIC_APP_SETTINGS_FALLBACK = {
  disputePeriodHours: 72,
  lessonChangePeriodHours: 12,
} as const;

export const APP_SETTINGS_LIMITS = {
  platformFeePercentage: { min: 0, max: 1 },
  platformFeePercent: { min: 0, max: 100 },
  settlementPeriodHours: { min: 1, max: 168 },
  disputePeriodHours: { min: 1, max: 720 },
  lessonChangePeriodHours: { min: 1, max: 168 },
  minWithdrawalAmountVnd: { min: 1, max: 9_007_199_254_740_991 },
  minWithdrawalAmountUsd: { min: 0.01, max: 1_000_000 },
  minWithdrawalAmountPhp: { min: 0.01, max: 10_000_000 },
} as const;
