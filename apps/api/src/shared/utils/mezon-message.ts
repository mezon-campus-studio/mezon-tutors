import { ChannelMessageContent, IInteractiveMessageProps } from 'mezon-sdk';

export const MEZON_EMBED_COLORS = {
  primary: '#4f46e5',
  success: '#059669',
  warning: '#d97706',
  error: '#dc2626',
  info: '#0284c7',
  neutral: '#6b7280',
} as const;

export const MEZONLY_BRAND_NAME = 'Mezonly';
export const MEZONLY_LOGO_URL = 'https://res.cloudinary.com/do2rk0jz8/image/upload/v1779258194/favicon_bvlxip.png';

export const buildMezonEmbedFooter = (): NonNullable<IInteractiveMessageProps['footer']> => ({
  text: MEZONLY_BRAND_NAME,
  icon_url: MEZONLY_LOGO_URL,
});

export const embedSenderThumbnail = (
  senderAvatarUrl?: string | null
): Pick<IInteractiveMessageProps, 'thumbnail'> | Record<string, never> =>
  senderAvatarUrl?.trim()
    ? { thumbnail: { url: senderAvatarUrl.trim() } }
    : {};

export const embedAdminThumbnail = (): Pick<IInteractiveMessageProps, 'thumbnail'> => ({
  thumbnail: { url: MEZONLY_LOGO_URL },
});

export const buildEmbedMessage = (
  embed: IInteractiveMessageProps,
  options?: { footer?: NonNullable<IInteractiveMessageProps['footer']> }
): ChannelMessageContent => ({
  embed: [
    {
      ...embed,
      footer: options?.footer ?? embed.footer,
      timestamp: embed.timestamp ?? new Date().toISOString(),
    },
  ],
});
