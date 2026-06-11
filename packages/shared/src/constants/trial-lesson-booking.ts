/** Minutes a trial/subscription slot stays reserved while payment is pending. */
export const TRIAL_LESSON_PAYMENT_HOLD_MINUTES = 15;

/** @alias TRIAL_LESSON_PAYMENT_HOLD_MINUTES — shared hold for trial + subscription checkout */
export const BOOKING_PAYMENT_HOLD_MINUTES = TRIAL_LESSON_PAYMENT_HOLD_MINUTES;

export const TRIAL_LESSON_PAYMENT_HOLD_MS =
  TRIAL_LESSON_PAYMENT_HOLD_MINUTES * 60 * 1000;

/** @alias TRIAL_LESSON_PAYMENT_HOLD_MS */
export const BOOKING_PAYMENT_HOLD_MS = TRIAL_LESSON_PAYMENT_HOLD_MS;

export function trialLessonPaymentHoldExpiresAt(createdAt: Date | string): Date {
  const created =
    typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  return new Date(created.getTime() + TRIAL_LESSON_PAYMENT_HOLD_MS);
}

export function isTrialLessonPaymentHoldActive(
  createdAt: Date | string,
  now = Date.now(),
): boolean {
  const created =
    typeof createdAt === "string"
      ? new Date(createdAt).getTime()
      : createdAt.getTime();
  return now - created < TRIAL_LESSON_PAYMENT_HOLD_MS;
}

/** @alias isTrialLessonPaymentHoldActive */
export const isBookingPaymentHoldActive = isTrialLessonPaymentHoldActive;
