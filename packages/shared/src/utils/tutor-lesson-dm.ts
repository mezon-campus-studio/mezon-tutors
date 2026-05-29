import type {
  MezonDirectMessageContent,
  MezonEmbedPayload,
  StudentLessonDmKind,
  StudentLessonDmLocale,
} from './student-lesson-dm';

const EMBED_COLORS = {
  warning: '#d97706',
} as const;

const MEZONLY_BRAND = 'Mezonly';
const MEZONLY_LOGO_URL =
  'https://res.cloudinary.com/do2rk0jz8/image/upload/v1779258194/favicon_bvlxip.png';

const copy = {
  vi: {
    cancelTitle: 'Yêu cầu hủy buổi học',
    cancelDescription:
      'Tôi là gia sư. Tôi nhờ bạn hỗ trợ hủy buổi học này — vui lòng kiểm tra thông tin bên dưới.',
    rescheduleRequestTitle: 'Yêu cầu đổi lịch',
    rescheduleRequestDescription:
      'Tôi là gia sư và gửi yêu cầu đổi lịch, vui lòng xem chi tiết.',
    trial: 'Buổi học thử',
    subscription: 'Buổi Subscription',
    original: 'Lịch cũ',
    reason: 'Lý do',
    message: 'Tin nhắn',
    messageEmpty: '—',
  },
  en: {
    cancelTitle: 'Lesson cancellation request',
    cancelDescription:
      'I am your tutor. I am asking for your help to cancel this lesson — please review the details below.',
    rescheduleRequestTitle: 'Reschedule request',
    rescheduleRequestDescription:
      'I am your tutor and submitted a reschedule request. Please review the details below.',
    trial: 'Trial lesson',
    subscription: 'Subscription lesson',
    original: 'Original',
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

/** Tutor cancel is a request only (lesson stays on calendar until the student acts). */
export function buildTutorLessonCancelledDmContent(params: {
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
      color: EMBED_COLORS.warning,
      title: t.cancelTitle,
      description: `${t.cancelDescription}\n${lessonKindLabel(params.lessonKind, loc)}`,
      fields: [
        { name: t.original, value: params.originalLabel, inline: false },
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
      color: EMBED_COLORS.warning,
      title: t.rescheduleRequestTitle,
      description: `${t.rescheduleRequestDescription}\n${lessonKindLabel(params.lessonKind, loc)}`,
      fields: [
        { name: t.original, value: params.originalLabel, inline: false },
        { name: t.reason, value: params.reasonLabel, inline: false },
        { name: t.message, value: messageValue, inline: false },
      ],
    },
    params.senderAvatarUrl
  );
}
