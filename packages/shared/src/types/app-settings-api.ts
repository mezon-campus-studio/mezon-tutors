export type AppSettings = {
  id: string;
  platformFeePercentage: number;
  settlementPeriodHours: number;
  disputePeriodHours: number;
  lessonChangePeriodHours: number;
  minWithdrawalAmountVnd: number;
  minWithdrawalAmountUsd: number;
  minWithdrawalAmountPhp: number;
  updatedByUserId: string | null;
  updatedBy: {
    id: string;
    username: string;
  } | null;
  updatedAt: string;
};

export type PublicAppSettings = {
  platformFeePercentage: number;
  settlementPeriodHours: number;
  disputePeriodHours: number;
  lessonChangePeriodHours: number;
  minWithdrawalAmountVnd: number;
  minWithdrawalAmountUsd: number;
  minWithdrawalAmountPhp: number;
};

export type UpdateAppSettingsBody = {
  platformFeePercentage?: number;
  settlementPeriodHours?: number;
  disputePeriodHours?: number;
  lessonChangePeriodHours?: number;
  minWithdrawalAmountVnd?: number;
  minWithdrawalAmountUsd?: number;
  minWithdrawalAmountPhp?: number;
};
