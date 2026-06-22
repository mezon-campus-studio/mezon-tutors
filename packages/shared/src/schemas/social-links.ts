import { z } from 'zod';
import type { SocialLinks } from '../types/app-settings-api';

const optionalUrlField = z
  .string()
  .trim()
  .transform((value) => value || undefined)
  .pipe(z.union([z.undefined(), z.string().url()]));

export const socialLinksSchema = z.object({
  facebook: optionalUrlField.optional(),
  instagram: optionalUrlField.optional(),
  youtube: optionalUrlField.optional(),
  tiktok: optionalUrlField.optional(),
  linkedin: optionalUrlField.optional(),
  twitter: optionalUrlField.optional(),
});

export type SocialLinksValidationMessages = {
  invalidUrl: string;
};

function optionalUrlFormField(messages: SocialLinksValidationMessages) {
  return z
    .string()
    .trim()
    .refine((value) => value === '' || z.string().url().safeParse(value).success, messages.invalidUrl);
}

export function normalizeSocialLinksForStorage(input?: SocialLinks | null): SocialLinks | null {
  if (!input) return null;

  const parsed = socialLinksSchema.safeParse(input);
  if (!parsed.success) return null;

  const hasAny = Object.values(parsed.data).some((v) => Boolean(v));
  if (!hasAny) return null;

  const out: SocialLinks = {} as SocialLinks;
  for (const key of Object.keys(parsed.data) as Array<keyof SocialLinks>) {
    const value = parsed.data[key];
    if (value) out[key] = value;
  }
  return out;
}

export function createSocialLinksFormFieldsSchema(messages: SocialLinksValidationMessages) {
  const urlField = optionalUrlFormField(messages);

  return z.object({
    socialFacebook: urlField,
    socialInstagram: urlField,
    socialYoutube: urlField,
    socialTiktok: urlField,
    socialLinkedin: urlField,
    socialTwitter: urlField,
  });
}

export function mapSocialLinksFormToStorage(values: Record<string, string>): SocialLinks | null {
  return normalizeSocialLinksForStorage({
    facebook: (values.socialFacebook ?? '').trim() || undefined,
    instagram: (values.socialInstagram ?? '').trim() || undefined,
    youtube: (values.socialYoutube ?? '').trim() || undefined,
    tiktok: (values.socialTiktok ?? '').trim() || undefined,
    linkedin: (values.socialLinkedin ?? '').trim() || undefined,
    twitter: (values.socialTwitter ?? '').trim() || undefined,
  });
}

export function mapSocialLinksToFormValues(socialLinks: SocialLinks | null | undefined) {
  return {
    socialFacebook: socialLinks?.facebook ?? '',
    socialInstagram: socialLinks?.instagram ?? '',
    socialYoutube: socialLinks?.youtube ?? '',
    socialTiktok: socialLinks?.tiktok ?? '',
    socialLinkedin: socialLinks?.linkedin ?? '',
    socialTwitter: socialLinks?.twitter ?? '',
  };
}
