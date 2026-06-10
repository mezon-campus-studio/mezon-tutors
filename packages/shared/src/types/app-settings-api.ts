export type MezonChannelAppInviteLinks = {
  home?: string;
  wallet?: string;
  myLessons?: string;
  mySchedule?: string;
};

export type MezonLinks = {
  botInviteLink?: string;
  channelAppInviteLinks?: MezonChannelAppInviteLinks;
};

export type AppSettings = {
  id: string;
  platformFeePercentage: number;
  settlementPeriodHours: number;
  disputePeriodHours: number;
  lessonChangePeriodHours: number;
  minWithdrawalAmountVnd: number;
  minWithdrawalAmountUsd: number;
  minWithdrawalAmountPhp: number;
  mezonLinks: MezonLinks | null;
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
  mezonLinks: MezonLinks | null;
};

export type UpdateAppSettingsBody = {
  platformFeePercentage?: number;
  settlementPeriodHours?: number;
  disputePeriodHours?: number;
  lessonChangePeriodHours?: number;
  minWithdrawalAmountVnd?: number;
  minWithdrawalAmountUsd?: number;
  minWithdrawalAmountPhp?: number;
  mezonLinks?: MezonLinks | null;
};
