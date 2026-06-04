export const LESSON_COMPLAINT_STATUS_FILTERS = [
  'all',
  'PENDING',
  'TUTOR_CONFIRMED',
  'TUTOR_REJECTED',
  'APPROVED',
  'REJECTED',
] as const;

export type LessonComplaintStatusFilter = (typeof LESSON_COMPLAINT_STATUS_FILTERS)[number];

export const LESSON_COMPLAINT_REASON_KEYS = [
  'tutorNoShow',
  'poorQuality',
  'technicalIssue',
  'wrongContent',
  'other',
] as const;

export type LessonComplaintReasonKey = (typeof LESSON_COMPLAINT_REASON_KEYS)[number];

export const MAX_LESSON_COMPLAINT_ATTACHMENTS = 10;

export const LESSON_COMPLAINT_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'] as const;
