import { z } from 'zod';
import { APP_SETTINGS_LIMITS, DEFAULT_INTRO_VIDEO_MAX_DURATION_SECONDS } from '../constants/app-settings';
import type { YoutubeSettings } from '../types/app-settings-api';

const playlistIdField = z
  .string()
  .trim()
  .transform((value) => value || undefined)
  .pipe(
    z.union([
      z.undefined(),
      z
        .string()
        .regex(/^PL[\w-]+$/, 'Invalid YouTube playlist ID'),
    ]),
  );

export const youtubeSettingsSchema = z.object({
  playlistId: playlistIdField.optional(),
  introVideoMaxDurationSeconds: z
    .number()
    .int()
    .min(APP_SETTINGS_LIMITS.introVideoMaxDurationSeconds.min)
    .max(APP_SETTINGS_LIMITS.introVideoMaxDurationSeconds.max)
    .optional(),
});

export type YoutubeSettingsValidationMessages = {
  invalidPlaylistId: string;
  introVideoMaxDurationSecondsRange: string;
};

export function normalizeYoutubeSettingsForStorage(
  input?: YoutubeSettings | null,
): YoutubeSettings | null {
  if (!input) return null;

  const parsed = youtubeSettingsSchema.safeParse(input);
  if (!parsed.success) return null;

  const hasPlaylist = Boolean(parsed.data.playlistId);
  const hasDuration = typeof parsed.data.introVideoMaxDurationSeconds === 'number';

  if (!hasPlaylist && !hasDuration) return null;

  const out: YoutubeSettings = {};
  if (parsed.data.playlistId) out.playlistId = parsed.data.playlistId;
  if (hasDuration) {
    out.introVideoMaxDurationSeconds = parsed.data.introVideoMaxDurationSeconds;
  }
  return out;
}

export function resolveIntroVideoMaxDurationSeconds(
  settings?: YoutubeSettings | null,
): number {
  return (
    settings?.introVideoMaxDurationSeconds ?? DEFAULT_INTRO_VIDEO_MAX_DURATION_SECONDS
  );
}

export function createYoutubeSettingsFormFieldsSchema(
  messages: YoutubeSettingsValidationMessages,
) {
  const limits = APP_SETTINGS_LIMITS.introVideoMaxDurationSeconds;

  return z.object({
    youtubePlaylistId: z
      .string()
      .trim()
      .refine(
        (value) => value === '' || /^PL[\w-]+$/.test(value),
        messages.invalidPlaylistId,
      ),
    youtubeIntroVideoMaxDurationSeconds: z
      .string()
      .trim()
      .min(1, messages.introVideoMaxDurationSecondsRange)
      .refine((value) => /^\d+$/.test(value), messages.introVideoMaxDurationSecondsRange)
      .transform((value) => Number.parseInt(value, 10))
      .pipe(
        z
          .number()
          .int()
          .min(limits.min, messages.introVideoMaxDurationSecondsRange)
          .max(limits.max, messages.introVideoMaxDurationSecondsRange),
      ),
  });
}

export function mapYoutubeSettingsFormToStorage(
  values: Record<string, string | number>,
): YoutubeSettings | null {
  return normalizeYoutubeSettingsForStorage({
    playlistId: String(values.youtubePlaylistId ?? '').trim() || undefined,
    introVideoMaxDurationSeconds:
      typeof values.youtubeIntroVideoMaxDurationSeconds === 'number'
        ? values.youtubeIntroVideoMaxDurationSeconds
        : undefined,
  });
}

export function mapYoutubeSettingsToFormValues(
  youtubeSettings: YoutubeSettings | null | undefined,
) {
  return {
    youtubePlaylistId: youtubeSettings?.playlistId ?? '',
    youtubeIntroVideoMaxDurationSeconds: String(
      resolveIntroVideoMaxDurationSeconds(youtubeSettings),
    ),
  };
}
