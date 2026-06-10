import type { MezonLinks } from '../types/app-settings-api';

export function buildUtilitiesChannelAppTipLinks(
  mezonLinks?: MezonLinks | null,
): Record<string, string> {
  const links = mezonLinks?.channelAppInviteLinks;

  return {
    homeLink: links?.home ?? '',
    walletLink: links?.wallet ?? '',
    myLessonsLink: links?.myLessons ?? '',
    myScheduleLink: links?.mySchedule ?? '',
  };
}

export function getOnboardingImageSrcForCheck(
  tipIndex: number,
  images?: readonly string[],
): string | undefined {
  const src = images?.[tipIndex]?.trim();
  return src || undefined;
}

export function hasOnboardingImageForCheck(
  tipIndex: number,
  images?: readonly string[],
): images is readonly string[] {
  return Boolean(getOnboardingImageSrcForCheck(tipIndex, images));
}
