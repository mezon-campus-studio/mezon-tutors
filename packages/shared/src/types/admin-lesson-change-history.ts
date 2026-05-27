export type AdminLessonChangeAction = 'CANCEL' | 'RESCHEDULE';

export type AdminLessonChangeLessonType = 'TRIAL' | 'SUBSCRIPTION';

export type AdminLessonChangeInitiatorRole = 'STUDENT' | 'TUTOR' | 'SYSTEM';

export type AdminLessonChangeHistoryItem = {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  action: AdminLessonChangeAction;
  lessonType: AdminLessonChangeLessonType;
  initiatedByRole: AdminLessonChangeInitiatorRole;
  initiatedByName: string;
  reason: string;
  message: string | null;
  originalStartAt: string;
  originalDurationMinutes: number;
  trialLessonBookingId: string | null;
  subscriptionEnrollmentId: string | null;
  subscriptionSlotIndex: number | null;
  createdAt: string;
};
