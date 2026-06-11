import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { DEFAULT_TIMEZONE } from '../constants/my-schedule';

dayjs.extend(utc);
dayjs.extend(timezone);

const MAX_PAYMENT_DESCRIPTION_LENGTH = 200;

export function formatTutorDisplayName(parts: {
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
}): string {
  const fullName = `${parts.firstName ?? ''} ${parts.lastName ?? ''}`.trim();
  return fullName || parts.username?.trim() || 'Tutor';
}

export function formatPaymentLessonStartAt(
  startAt: Date | string,
  timezoneName = DEFAULT_TIMEZONE,
): string {
  return dayjs(startAt).tz(timezoneName).format('DD/MM/YYYY HH:mm');
}

export function formatPaymentSlotStartAt(
  date: string,
  startTime: string,
  timezoneName = DEFAULT_TIMEZONE,
): string {
  return dayjs
    .tz(`${date} ${startTime}`, 'YYYY-MM-DD HH:mm', timezoneName)
    .format('DD/MM/YYYY HH:mm');
}

function truncatePaymentDescription(value: string): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= MAX_PAYMENT_DESCRIPTION_LENGTH) {
    return normalized;
  }
  return `${normalized.slice(0, MAX_PAYMENT_DESCRIPTION_LENGTH - 3)}...`;
}

export function buildTrialLessonPaymentDescription(params: {
  bookingId: string;
  startAt: Date | string;
  tutorName: string;
  timezone?: string;
}): string {
  const shortId = params.bookingId.replaceAll('-', '').slice(0, 8);
  const startLabel = formatPaymentLessonStartAt(params.startAt, params.timezone);
  return truncatePaymentDescription(
    `Trial lesson #${shortId} | ${startLabel} | with ${params.tutorName}`,
  );
}

export function buildSubscriptionPaymentDescription(params: {
  enrollmentId: string;
  lessonsPerWeek: number;
  firstSlotDate: string;
  firstSlotStartTime: string;
  tutorName: string;
  timezone?: string;
}): string {
  const shortId = params.enrollmentId.replaceAll('-', '').slice(0, 8);
  const startLabel = formatPaymentSlotStartAt(
    params.firstSlotDate,
    params.firstSlotStartTime,
    params.timezone,
  );
  return truncatePaymentDescription(
    `Subscription ${params.lessonsPerWeek} lessons/week #${shortId} | ${startLabel} | with ${params.tutorName}`,
  );
}
