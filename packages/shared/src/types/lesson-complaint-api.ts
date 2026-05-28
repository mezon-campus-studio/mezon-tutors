import type { ELessonComplaintStatus } from '../enums/lesson-complaint';

export type LessonComplaintLessonType = 'TRIAL' | 'SUBSCRIPTION';

export type CreateLessonComplaintBody = {
  lessonType: LessonComplaintLessonType;
  trialLessonBookingId?: string;
  subscriptionEnrollmentId?: string;
  subscriptionSlotIndex?: number;
  lessonStartAt?: string;
  reason: string;
  message?: string;
};

export type LessonComplaintCreatedResult = {
  id: string;
  status: ELessonComplaintStatus;
};

export type StudentLessonComplaintItem = {
  id: string;
  status: ELessonComplaintStatus;
  lesson_type: LessonComplaintLessonType;
  reason: string;
  message: string | null;
  lesson_start_at: string;
  lesson_duration_minutes: number;
  created_at: string;
  admin_note: string | null;
  reviewed_at: string | null;
  tutor: {
    id: string;
    first_name: string;
    last_name: string;
    subject: string;
    avatar: string;
  };
};

export type AdminLessonComplaintListItem = {
  id: string;
  status: ELessonComplaintStatus;
  lesson_type: LessonComplaintLessonType;
  reason: string;
  message: string | null;
  lesson_start_at: string;
  lesson_duration_minutes: number;
  created_at: string;
  student: {
    id: string;
    username: string;
    email: string;
    avatar: string;
  };
  tutor: {
    id: string;
    first_name: string;
    last_name: string;
    subject: string;
    avatar: string;
  };
  trial_lesson_booking_id: string | null;
  subscription_enrollment_id: string | null;
  subscription_slot_index: number | null;
  gross_amount: number | null;
  currency: string | null;
  admin_note: string | null;
  reviewed_at: string | null;
};

export type AdminLessonComplaintMetrics = {
  total_requests: number;
  total_this_week: number;
  total_approved: number;
};

export type ReviewLessonComplaintBody = {
  adminNote?: string;
};

export type ReviewLessonComplaintResult = {
  id: string;
  status: ELessonComplaintStatus;
  refunded: boolean;
};
