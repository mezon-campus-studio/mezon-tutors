/**
 * Lesson checkout cancel / fail (trial + subscription plan) — URL ?code= matches these values.
 * Mapped from VNPAY vnp_ResponseCode / vnp_TransactionStatus on browser return (API redirect).
 */
export const LESSON_CANCEL_REASON_SLOT_CONFLICT = 'slot_conflict_after_payment';

export const LESSON_CHECKOUT_SLOT_UNAVAILABLE_AFTER_PAYMENT_CODE =
  'slot_unavailable_after_payment' as const;

export const LESSON_CHECKOUT_CANCEL_CODES = [
  'user_cancelled',
  'payment_declined',
  'auth_failed',
  'session_expired',
  'gateway_error',
  'invalid_signature',
  'order_not_found',
  LESSON_CHECKOUT_SLOT_UNAVAILABLE_AFTER_PAYMENT_CODE,
  'unknown',
] as const;

export type LessonCheckoutCancelCode = (typeof LESSON_CHECKOUT_CANCEL_CODES)[number];

export function isLessonCheckoutCancelCode(s: string): s is LessonCheckoutCancelCode {
  return (LESSON_CHECKOUT_CANCEL_CODES as readonly string[]).includes(s);
}

/**
 * Map VNPAY response codes to a small set of UI buckets (non-success paths only).
 * Ref: VNPAY sandbox response code list (00 = success).
 */
export function mapVnpayResponseToLessonCancelCode(
  responseCode: string | undefined,
  transactionStatus: string | undefined
): LessonCheckoutCancelCode {
  const rc = (responseCode ?? '').trim();
  const ts = (transactionStatus ?? '').trim();

  if (rc === '24') return 'user_cancelled';

  if (rc === '11') return 'session_expired';

  if (['10', '13'].includes(rc)) return 'auth_failed';

  if (['51', '12', '65', '09', '79', '07'].includes(rc)) {
    return 'payment_declined';
  }

  if (['75', '99'].includes(rc)) return 'gateway_error';

  if (ts === '02') return 'payment_declined';

  if (rc === '00' && ts && ts !== '00') {
    return 'gateway_error';
  }

  return 'unknown';
}

export function lessonCheckoutCancelIsSoftTone(code: LessonCheckoutCancelCode): boolean {
  return (
    code === 'user_cancelled' ||
    code === 'session_expired' ||
    code === LESSON_CHECKOUT_SLOT_UNAVAILABLE_AFTER_PAYMENT_CODE
  );
}

export function resolveLessonCancelCodeFromSearchParams(
  searchParams: URLSearchParams | null
): LessonCheckoutCancelCode {
  const raw = searchParams?.get('code')?.trim() ?? '';
  if (raw && isLessonCheckoutCancelCode(raw)) {
    return raw;
  }

  const legacy = searchParams?.get('reason')?.toLowerCase().trim() ?? '';
  if (legacy === 'failed' || legacy === 'error' || legacy === 'declined') {
    return 'gateway_error';
  }

  return 'user_cancelled';
}

/** @deprecated Use LESSON_* from lesson-checkout-outcome */
export const TRIAL_LESSON_CANCEL_REASON_SLOT_CONFLICT = LESSON_CANCEL_REASON_SLOT_CONFLICT;
/** @deprecated Use LESSON_CHECKOUT_SLOT_UNAVAILABLE_AFTER_PAYMENT_CODE */
export const TRIAL_LESSON_CHECKOUT_SLOT_UNAVAILABLE_AFTER_PAYMENT_CODE =
  LESSON_CHECKOUT_SLOT_UNAVAILABLE_AFTER_PAYMENT_CODE;
/** @deprecated Use LESSON_CHECKOUT_CANCEL_CODES */
export const TRIAL_LESSON_CHECKOUT_CANCEL_CODES = LESSON_CHECKOUT_CANCEL_CODES;
/** @deprecated Use LessonCheckoutCancelCode */
export type TrialLessonCheckoutCancelCode = LessonCheckoutCancelCode;
/** @deprecated Use isLessonCheckoutCancelCode */
export const isTrialLessonCheckoutCancelCode = isLessonCheckoutCancelCode;
/** @deprecated Use mapVnpayResponseToLessonCancelCode */
export const mapVnpayResponseToTrialLessonCancelCode = mapVnpayResponseToLessonCancelCode;
/** @deprecated Use lessonCheckoutCancelIsSoftTone */
export const trialLessonCheckoutCancelIsSoftTone = lessonCheckoutCancelIsSoftTone;
/** @deprecated Use resolveLessonCancelCodeFromSearchParams */
export const resolveTrialLessonCancelCodeFromSearchParams = resolveLessonCancelCodeFromSearchParams;
