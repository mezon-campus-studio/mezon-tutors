import type {
  MezonDirectMessageContent,
  MezonEmbedPayload,
  StudentLessonDmKind,
  StudentLessonDmLocale,
} from './student-lesson-dm';

const EMBED_COLORS = {
  error: '#dc2626',
} as const;

const MEZONLY_BRAND = 'Mezonly';
const MEZONLY_LOGO_URL =
  'https://res.cloudinary.com/do2rk0jz8/image/upload/v1779258194/favicon_bvlxip.png';

const copy = {
  vi: {
    cancelTitle: 'Gia sư đã hủy buổi học',
    cancelDescription: 'Tôi đã hủy buổi học này. Vui lòng xem chi tiết bên dưới.',
    rescheduleRequestTitle: 'Yêu cầu đổi lịch',
    rescheduleRequestDescription:
      'Tôi là gia sư và gửi yêu cầu đổi lịch, vui lòng xem chi tiết.',
    trial: 'Buổi học thử',
    subscription: 'Buổi Subscription',
    schedule: 'Thời gian buổi học',
    refund: 'Số tiền hoàn về ví',
    refundNone: 'Không có khoản hoàn tiền',
    reason: 'Lý do',
    message: 'Tin nhắn',
    messageEmpty: '—',
  },
  en: {
    cancelTitle: 'Tutor cancelled the lesson',
    cancelDescription: 'I cancelled this lesson. Please review the details below.',
    rescheduleRequestTitle: 'Reschedule request',
    rescheduleRequestDescription:
      'I am your tutor and submitted a reschedule request. Please review the details below.',
    trial: 'Trial lesson',
    subscription: 'Subscription lesson',
    schedule: 'Lesson time',
    refund: 'Refund to wallet',
    refundNone: 'No refund issued',
    reason: 'Reason',
    message: 'Message',
    messageEmpty: '—',
  },
} as const;

function resolveLocale(locale?: string): StudentLessonDmLocale {
  return locale === 'vi' ? 'vi' : 'en';
}

function lessonKindLabel(kind: StudentLessonDmKind, locale: StudentLessonDmLocale): string {
  return kind === 'trial' ? copy[locale].trial : copy[locale].subscription;
}

function buildEmbed(
  embed: MezonEmbedPayload,
  senderAvatarUrl?: string | null
): MezonDirectMessageContent {
  const thumbnail =
    senderAvatarUrl?.trim() != null && senderAvatarUrl.trim() !== ''
      ? { url: senderAvatarUrl.trim() }
      : undefined;

  return {
    embed: [
      {
        ...embed,
        footer: embed.footer ?? { text: MEZONLY_BRAND, icon_url: MEZONLY_LOGO_URL },
        timestamp: embed.timestamp ?? new Date().toISOString(),
        ...(thumbnail ? { thumbnail } : {}),
      },
    ],
  };
}

/** Tutor cancelled a lesson; student receives refund details when applicable. */
export function buildTutorLessonCancelledDmContent(params: {
  lessonKind: StudentLessonDmKind;
  originalLabel: string;
  reasonLabel: string;
  message?: string | null;
  refundAmountLabel?: string | null;
  locale?: string;
  senderAvatarUrl?: string | null;
}): MezonDirectMessageContent {
  const loc = resolveLocale(params.locale);
  const t = copy[loc];
  const messageValue = params.message?.trim() ? params.message.trim() : t.messageEmpty;
  const refundValue =
    params.refundAmountLabel?.trim() != null && params.refundAmountLabel.trim() !== ''
      ? params.refundAmountLabel.trim()
      : t.refundNone;

  return buildEmbed(
    {
      color: EMBED_COLORS.error,
      title: t.cancelTitle,
      description: `${t.cancelDescription}\n${lessonKindLabel(params.lessonKind, loc)}`,
      fields: [
        { name: t.schedule, value: params.originalLabel, inline: false },
        { name: t.refund, value: refundValue, inline: false },
        { name: t.reason, value: params.reasonLabel, inline: false },
        { name: t.message, value: messageValue, inline: false },
      ],
    },
    params.senderAvatarUrl
  );
}

/** Tutor reschedule is a request only (no new slot picked). */
export function buildTutorLessonRescheduleRequestDmContent(params: {
  lessonKind: StudentLessonDmKind;
  originalLabel: string;
  reasonLabel: string;
  message?: string | null;
  locale?: string;
  senderAvatarUrl?: string | null;
}): MezonDirectMessageContent {
  const loc = resolveLocale(params.locale);
  const t = copy[loc];
  const messageValue = params.message?.trim() ? params.message.trim() : t.messageEmpty;

  return buildEmbed(
    {
      color: '#d97706',
      title: t.rescheduleRequestTitle,
      description: `${t.rescheduleRequestDescription}\n${lessonKindLabel(params.lessonKind, loc)}`,
      fields: [
        { name: copy[loc].schedule, value: params.originalLabel, inline: false },
        { name: t.reason, value: params.reasonLabel, inline: false },
        { name: t.message, value: messageValue, inline: false },
      ],
    },
    params.senderAvatarUrl
  );
}
