import { z } from 'zod';
import type { MezonLinks } from '../types/app-settings-api';

const optionalUrlField = z
  .string()
  .trim()
  .transform((value) => value || undefined)
  .pipe(z.union([z.undefined(), z.string().url()]));

export const mezonChannelAppInviteLinksSchema = z.object({
  home: optionalUrlField.optional(),
  wallet: optionalUrlField.optional(),
  myLessons: optionalUrlField.optional(),
  mySchedule: optionalUrlField.optional(),
});

export const mezonLinksSchema = z.object({
  botInviteLink: optionalUrlField.optional(),
  channelAppInviteLinks: mezonChannelAppInviteLinksSchema.optional(),
});

export type MezonLinksValidationMessages = {
  invalidUrl: string;
};

function optionalUrlFormField(messages: MezonLinksValidationMessages) {
  return z
    .string()
    .trim()
    .refine((value) => value === '' || z.string().url().safeParse(value).success, messages.invalidUrl);
}

export function normalizeMezonLinksForStorage(input?: MezonLinks | null): MezonLinks | null {
  if (!input) return null;

  const parsed = mezonLinksSchema.safeParse(input);
  if (!parsed.success) return null;

  const { botInviteLink, channelAppInviteLinks } = parsed.data;
  const hasChannelAppLinks =
    channelAppInviteLinks &&
    Object.values(channelAppInviteLinks).some((value) => Boolean(value));

  if (!botInviteLink && !hasChannelAppLinks) {
    return null;
  }

  return {
    ...(botInviteLink ? { botInviteLink } : {}),
    ...(hasChannelAppLinks ? { channelAppInviteLinks } : {}),
  };
}

export function createMezonLinksFormFieldsSchema(messages: MezonLinksValidationMessages) {
  const urlField = optionalUrlFormField(messages);

  return z.object({
    botInviteLink: urlField,
    channelAppHomeLink: urlField,
    channelAppWalletLink: urlField,
    channelAppMyLessonsLink: urlField,
    channelAppMyScheduleLink: urlField,
  });
}

export function mapMezonLinksFormToStorage(values: {
  botInviteLink: string;
  channelAppHomeLink: string;
  channelAppWalletLink: string;
  channelAppMyLessonsLink: string;
  channelAppMyScheduleLink: string;
}): MezonLinks | null {
  return normalizeMezonLinksForStorage({
    botInviteLink: values.botInviteLink.trim() || undefined,
    channelAppInviteLinks: {
      home: values.channelAppHomeLink.trim() || undefined,
      wallet: values.channelAppWalletLink.trim() || undefined,
      myLessons: values.channelAppMyLessonsLink.trim() || undefined,
      mySchedule: values.channelAppMyScheduleLink.trim() || undefined,
    },
  });
}

export function mapMezonLinksToFormValues(mezonLinks: MezonLinks | null | undefined) {
  return {
    botInviteLink: mezonLinks?.botInviteLink ?? '',
    channelAppHomeLink: mezonLinks?.channelAppInviteLinks?.home ?? '',
    channelAppWalletLink: mezonLinks?.channelAppInviteLinks?.wallet ?? '',
    channelAppMyLessonsLink: mezonLinks?.channelAppInviteLinks?.myLessons ?? '',
    channelAppMyScheduleLink: mezonLinks?.channelAppInviteLinks?.mySchedule ?? '',
  };
}
