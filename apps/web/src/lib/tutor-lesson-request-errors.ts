import { ApiError } from "@/services/api-client";

const CANCEL_ALREADY = "a cancellation request was already submitted";
const LESSON_ALREADY_CANCELLED = "already cancelled";
const LESSON_ALREADY_REFUNDED = "already refunded";
const RESCHEDULE_ALREADY = "a reschedule request was already submitted";
const CANCEL_WITHIN_12H = "cannot request cancellation within";
const RESCHEDULE_WITHIN_12H = "cannot request reschedule within 12 hours";

function messageLower(error: unknown): string {
  if (error instanceof ApiError) return error.message.toLowerCase();
  if (error instanceof Error) return error.message.toLowerCase();
  return "";
}

/** Expected 400s from tutor cancel/reschedule request APIs — avoid console.error (Next.js dev overlay). */
export function isExpectedTutorLessonRequestError(error: unknown): boolean {
  if (!(error instanceof ApiError) || error.status !== 400) return false;
  const m = messageLower(error);
  return (
    m.includes(CANCEL_ALREADY) ||
    m.includes(LESSON_ALREADY_CANCELLED) ||
    m.includes(LESSON_ALREADY_REFUNDED) ||
    m.includes(RESCHEDULE_ALREADY) ||
    m.includes(CANCEL_WITHIN_12H) ||
    m.includes(RESCHEDULE_WITHIN_12H)
  );
}

export function resolveTutorCancelToastMessage(
  error: unknown,
  t: (key: "alreadyCancelled" | "within12Hours" | "failed") => string,
): string {
  const m = messageLower(error);
  if (
    m.includes(CANCEL_ALREADY) ||
    m.includes(LESSON_ALREADY_CANCELLED) ||
    m.includes(LESSON_ALREADY_REFUNDED)
  ) {
    return t("alreadyCancelled");
  }
  if (m.includes(CANCEL_WITHIN_12H)) return t("within12Hours");
  if (error instanceof Error && error.message) return error.message;
  return t("failed");
}

export function resolveTutorRescheduleToastMessage(
  error: unknown,
  t: (key: "alreadyRequested" | "within12Hours" | "failed") => string,
): string {
  const m = messageLower(error);
  if (m.includes(RESCHEDULE_ALREADY)) return t("alreadyRequested");
  if (m.includes(RESCHEDULE_WITHIN_12H)) return t("within12Hours");
  if (error instanceof Error && error.message) return error.message;
  return t("failed");
}
