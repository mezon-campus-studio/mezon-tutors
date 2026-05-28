import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

export type StudentLessonDmLocale = 'vi' | 'en';
export type StudentLessonDmKind = 'trial' | 'subscription';

export type MezonEmbedField = {
  name: string;
  value: string;
  inline?: boolean;
};

export type MezonEmbedPayload = {
  color?: string;
  title?: string;
  description?: string;
  fields?: MezonEmbedField[];
  footer?: { text: string; icon_url?: string };
  timestamp?: string;
  thumbnail?: { url: string };
};

/** Content shape accepted by Mezon Light / Mezon SDK direct messages. */
export type MezonDirectMessageContent = {
  t?: string;
  embed?: MezonEmbedPayload[];
};

const EMBED_COLORS = {
  warning: '#d97706',
  error: '#dc2626',
} as const;

const MEZONLY_BRAND = 'Mezonly';
const MEZONLY_LOGO_URL =
  'https://res.cloudinary.com/do2rk0jz8/image/upload/v1779258194/favicon_bvlxip.png';

const copy = {
  vi: {
    cancelTitle: 'Hủy buổi học',
    cancelDescription: 'Tôi thực hiện hủy lịch, vui lòng xem thay đổi.',
    rescheduleTitle: 'Đổi lịch buổi học',
    rescheduleDescription: 'Tôi thực hiện đổi lịch, vui lòng xem thay đổi.',
    trial: 'Buổi học thử',
    subscription: 'Buổi Subscription',
    original: 'Lịch cũ',
    newTime: 'Lịch mới',
    reason: 'Lý do',
    message: 'Tin nhắn',
    messageEmpty: '—',
  },
  en: {
    cancelTitle: 'Lesson cancelled',
    cancelDescription: 'I cancelled this lesson. Please review the details below.',
    rescheduleTitle: 'Lesson rescheduled',
    rescheduleDescription: 'I rescheduled this lesson. Please review the change below.',
    trial: 'Trial lesson',
    subscription: 'Subscription lesson',
    original: 'Original',
    newTime: 'New',
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

/**
 * Formats a lesson range in the viewer timezone with timezone name suffix.
 * Example: `Wednesday, June 3, 21:00 - 21:50 (Asia/Singapore)`
 */
export function formatLessonRangeInTimezone(
  startAtIso: string,
  durationMinutes: number,
  timezoneName: string,
  locale?: string
): string {
  const loc = resolveLocale(locale);
  const start = dayjs(startAtIso).tz(timezoneName).locale(loc);
  if (!start.isValid()) {
    return '—';
  }
  const end = start.add(durationMinutes, 'minute');
  const datePart = start.format('dddd, MMMM D');
  const range = `${start.format('HH:mm')} - ${end.format('HH:mm')}`;
  const tz = timezoneName.trim() || 'UTC';
  return `${datePart}, ${range} (${tz})`;
}

/** Wall-clock slot already in the student's timezone (ScheduleSelection). */
export function formatLessonRangeFromWallClock(
  dateYmd: string,
  startTime: string,
  endTime: string,
  timezoneName: string,
  locale?: string
): string {
  const loc = resolveLocale(locale);
  const start = dayjs.tz(`${dateYmd} ${startTime}`, timezoneName).locale(loc);
  if (!start.isValid()) {
    return '—';
  }
  const datePart = start.format('dddd, MMMM D');
  const tz = timezoneName.trim() || 'UTC';
  return `${datePart}, ${startTime} - ${endTime} (${tz})`;
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

export function buildStudentLessonCancelledDmContent(params: {
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
      color: EMBED_COLORS.error,
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

export function buildStudentLessonRescheduledDmContent(params: {
  lessonKind: StudentLessonDmKind;
  originalLabel: string;
  newLabel: string;
  locale?: string;
  senderAvatarUrl?: string | null;
}): MezonDirectMessageContent {
  const loc = resolveLocale(params.locale);
  const t = copy[loc];

  return buildEmbed(
    {
      color: EMBED_COLORS.warning,
      title: t.rescheduleTitle,
      description: `${t.rescheduleDescription}\n${lessonKindLabel(params.lessonKind, loc)}`,
      fields: [
        { name: t.original, value: params.originalLabel, inline: false },
        { name: t.newTime, value: params.newLabel, inline: false },
      ],
    },
    params.senderAvatarUrl
  );
}
