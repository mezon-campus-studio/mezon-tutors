import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

export const DEFAULT_TUTOR_WITHDRAWAL_TIMEZONE = 'Asia/Ho_Chi_Minh';
export const TUTOR_WITHDRAWAL_WINDOW_START_DAY = 1;
export const TUTOR_WITHDRAWAL_WINDOW_END_DAY = 10;
export const WITHDRAWAL_WINDOW_CLOSED_CODE = 'WITHDRAWAL_WINDOW_CLOSED';

export function isWithdrawalWindowOpen(
  now: Date = new Date(),
  userTimezone?: string
): boolean {
  const tz = userTimezone || DEFAULT_TUTOR_WITHDRAWAL_TIMEZONE;
  const dayOfMonth = dayjs(now).tz(tz).date();
  return (
    dayOfMonth >= TUTOR_WITHDRAWAL_WINDOW_START_DAY &&
    dayOfMonth <= TUTOR_WITHDRAWAL_WINDOW_END_DAY
  );
}

export const isTutorWithdrawalWindowOpen = isWithdrawalWindowOpen;
