/** Minutes a trial lesson slot stays reserved while payment is pending. */
export const TRIAL_LESSON_PAYMENT_HOLD_MINUTES = 10;

export const TRIAL_LESSON_PAYMENT_HOLD_MS =
  TRIAL_LESSON_PAYMENT_HOLD_MINUTES * 60 * 1000;

export function trialLessonPaymentHoldExpiresAt(createdAt: Date | string): Date {
  const created =
    typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  return new Date(created.getTime() + TRIAL_LESSON_PAYMENT_HOLD_MS);
}

export function isTrialLessonPaymentHoldActive(
  createdAt: Date | string,
  now = Date.now(),
): boolean {
  const created =
    typeof createdAt === 'string' ? new Date(createdAt).getTime() : createdAt.getTime();
  return now - created < TRIAL_LESSON_PAYMENT_HOLD_MS;
}
