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

export type SocialLinks = {
  facebook?: string;
  instagram?: string;
  youtube?: string;
  tiktok?: string;
  linkedin?: string;
  twitter?: string;
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
  subscriptionGroupDiscountRate: number;
  mezonLinks: MezonLinks | null;
  socialLinks: SocialLinks | null;
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
  subscriptionGroupDiscountRate: number;
  mezonLinks: MezonLinks | null;
  socialLinks: SocialLinks | null;
};

export type UpdateAppSettingsBody = {
  platformFeePercentage?: number;
  settlementPeriodHours?: number;
  disputePeriodHours?: number;
  lessonChangePeriodHours?: number;
  minWithdrawalAmountVnd?: number;
  minWithdrawalAmountUsd?: number;
  minWithdrawalAmountPhp?: number;
  subscriptionGroupDiscountRate?: number;
  mezonLinks?: MezonLinks | null;
  socialLinks?: SocialLinks | null;
};
