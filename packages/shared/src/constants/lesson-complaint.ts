export const LESSON_COMPLAINT_STATUS_FILTERS = [
  'all',
  'PENDING',
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
