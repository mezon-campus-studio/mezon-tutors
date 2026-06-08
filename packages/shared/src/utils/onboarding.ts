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
