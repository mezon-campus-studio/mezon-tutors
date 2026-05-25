import { ETrialLessonBookingStatus } from '@mezon-tutors/shared';

export type TutorBookingRequestUiStatus =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled';

export const mapTutorBookingStatusToUi = (
  status: ETrialLessonBookingStatus | string,
): TutorBookingRequestUiStatus => {
  const upper = String(status).toUpperCase();
  if (upper === 'CONFIRMED') return 'confirmed';
  if (upper === 'COMPLETED') return 'completed';
  if (upper === 'CANCELLED') return 'cancelled';
  return 'pending';
};
