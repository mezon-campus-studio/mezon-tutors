import { z } from 'zod';
import { APP_SETTINGS_LIMITS } from '../constants/app-settings';
import type { UpdateAppSettingsBody } from '../types/app-settings-api';
import {
  createMezonLinksFormFieldsSchema,
  mapMezonLinksFormToStorage,
} from './mezon-links';
import {
  createSocialLinksFormFieldsSchema,
  mapSocialLinksFormToStorage,
} from './social-links';

export type AppSettingsFormValues = {
  platformFeePercent: string;
  subscriptionGroupDiscountPercent: string;
  settlementPeriodHours: string;
  disputePeriodHours: string;
  lessonChangePeriodHours: string;
  minWithdrawalAmountVnd: string;
  minWithdrawalAmountUsd: string;
  minWithdrawalAmountPhp: string;
  botInviteLink: string;
  channelAppHomeLink: string;
  channelAppWalletLink: string;
  channelAppMyLessonsLink: string;
  channelAppMyScheduleLink: string;
  socialFacebook: string;
  socialInstagram: string;
  socialYoutube: string;
  socialTiktok: string;
  socialLinkedin: string;
  socialTwitter: string;
};

export type AppSettingsValidationMessages = {
  required: string;
  invalidNumber: string;
  integerOnly: string;
  invalidUrl: string;
  platformFeePercentRange: string;
  settlementPeriodHoursRange: string;
  disputePeriodHoursRange: string;
  lessonChangePeriodHoursRange: string;
  minWithdrawalAmountVndRange: string;
  minWithdrawalAmountUsdRange: string;
  minWithdrawalAmountPhpRange: string;
  subscriptionGroupDiscountPercentRange: string;
};

const limits = APP_SETTINGS_LIMITS;

function requiredIntString(
  messages: AppSettingsValidationMessages,
  rangeMessage: string,
  min: number,
  max: number,
) {
  return z
    .string()
    .trim()
    .min(1, messages.required)
    .refine((value) => /^\d+$/.test(value), messages.integerOnly)
    .transform((value) => Number.parseInt(value, 10))
    .pipe(z.number().int().min(min, rangeMessage).max(max, rangeMessage));
}

function requiredDecimalString(
  messages: AppSettingsValidationMessages,
  rangeMessage: string,
  min: number,
  max: number,
) {
  return z
    .string()
    .trim()
    .min(1, messages.required)
    .refine((value) => !Number.isNaN(Number(value)), messages.invalidNumber)
    .transform((value) => Number(value))
    .pipe(z.number().min(min, rangeMessage).max(max, rangeMessage));
}

export function createAppSettingsFormSchema(messages: AppSettingsValidationMessages) {
  const mezonLinksFields = createMezonLinksFormFieldsSchema({
    invalidUrl: messages.invalidUrl,
  }).shape;
  const socialLinksFields = createSocialLinksFormFieldsSchema({
    invalidUrl: messages.invalidUrl,
  }).shape;

  return z
    .object({
      platformFeePercent: z
        .string()
        .trim()
        .min(1, messages.required)
        .refine((value) => !Number.isNaN(Number(value)), messages.invalidNumber)
        .transform((value) => Number(value))
        .pipe(
          z
            .number()
            .min(limits.platformFeePercent.min, messages.platformFeePercentRange)
            .max(limits.platformFeePercent.max, messages.platformFeePercentRange),
        ),
      subscriptionGroupDiscountPercent: requiredIntString(
        messages,
        messages.subscriptionGroupDiscountPercentRange,
        limits.subscriptionGroupDiscountPercent.min,
        limits.subscriptionGroupDiscountPercent.max,
      ),
      settlementPeriodHours: requiredIntString(
        messages,
        messages.settlementPeriodHoursRange,
        limits.settlementPeriodHours.min,
        limits.settlementPeriodHours.max,
      ),
      disputePeriodHours: requiredIntString(
        messages,
        messages.disputePeriodHoursRange,
        limits.disputePeriodHours.min,
        limits.disputePeriodHours.max,
      ),
      lessonChangePeriodHours: requiredIntString(
        messages,
        messages.lessonChangePeriodHoursRange,
        limits.lessonChangePeriodHours.min,
        limits.lessonChangePeriodHours.max,
      ),
      minWithdrawalAmountVnd: requiredIntString(
        messages,
        messages.minWithdrawalAmountVndRange,
        limits.minWithdrawalAmountVnd.min,
        limits.minWithdrawalAmountVnd.max,
      ),
      minWithdrawalAmountUsd: requiredDecimalString(
        messages,
        messages.minWithdrawalAmountUsdRange,
        limits.minWithdrawalAmountUsd.min,
        limits.minWithdrawalAmountUsd.max,
      ),
      minWithdrawalAmountPhp: requiredDecimalString(
        messages,
        messages.minWithdrawalAmountPhpRange,
        limits.minWithdrawalAmountPhp.min,
        limits.minWithdrawalAmountPhp.max,
      ),
      ...mezonLinksFields,
      ...socialLinksFields,
    })
    .transform(
      (values): UpdateAppSettingsBody => ({
        platformFeePercentage: values.platformFeePercent / 100,
        subscriptionGroupDiscountRate:
          1 - values.subscriptionGroupDiscountPercent / 100,
        settlementPeriodHours: values.settlementPeriodHours,
        disputePeriodHours: values.disputePeriodHours,
        lessonChangePeriodHours: values.lessonChangePeriodHours,
        minWithdrawalAmountVnd: values.minWithdrawalAmountVnd,
        minWithdrawalAmountUsd: values.minWithdrawalAmountUsd,
        minWithdrawalAmountPhp: values.minWithdrawalAmountPhp,
        mezonLinks: mapMezonLinksFormToStorage({
          botInviteLink: values.botInviteLink,
          channelAppHomeLink: values.channelAppHomeLink,
          channelAppWalletLink: values.channelAppWalletLink,
          channelAppMyLessonsLink: values.channelAppMyLessonsLink,
          channelAppMyScheduleLink: values.channelAppMyScheduleLink,
        }),
        socialLinks: mapSocialLinksFormToStorage({
          socialFacebook: values.socialFacebook,
          socialInstagram: values.socialInstagram,
          socialYoutube: values.socialYoutube,
          socialTiktok: values.socialTiktok,
          socialLinkedin: values.socialLinkedin,
          socialTwitter: values.socialTwitter,
        }),
      }),
    );
}

export function mapAppSettingsFormErrors(
  error: z.ZodError,
): Partial<Record<keyof AppSettingsFormValues, string>> {
  const fieldErrors: Partial<Record<keyof AppSettingsFormValues, string>> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === 'string' && !fieldErrors[key as keyof AppSettingsFormValues]) {
      fieldErrors[key as keyof AppSettingsFormValues] = issue.message;
    }
  }
  return fieldErrors;
}
