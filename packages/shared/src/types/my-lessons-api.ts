export type MyLessonApiCategory = string

export type MyLessonApiStatus = 'upcoming' | 'completed'

export type MyLessonWeekDayApiItem = {
  short_label: string
  date_label: string
  /** YYYY-MM-DD in viewer timezone; used to align column headers with `day_index`. */
  date_ymd: string
}

export type MyLessonApiItemSource = 'trial' | 'subscription'

/** Trial lesson booking lifecycle; omitted for subscription slots. */
export type MyLessonTrialBookingStatus = 'confirmed' | 'cancelled' | 'completed'

export type MyLessonApiItem = {
  id: string
  subject: string
  tutor_id: string
  tutor_user_id: string
  tutor_name: string
  tutor_avatar: string
  tutor_mezon_user_id: string | null
  category: MyLessonApiCategory
  status: MyLessonApiStatus
  date_label: string
  time_label: string
  day_index: number
  start_hour: number
  end_hour: number
  source?: MyLessonApiItemSource
  /** UTC ISO-8601; used for cancellation refund policy (trial). */
  start_at?: string
  duration_minutes?: number
  gross_amount?: number
  currency?: string
  trial_booking_status?: MyLessonTrialBookingStatus
  /** Trial booking payment; trial lessons only. */
  trial_payment_status?: string
  /** Parent enrollment id; subscription slots only. */
  subscription_enrollment_id?: string
  /** Enrollment lifecycle; subscription slots only. */
  enrollment_status?: string
  /** Enrollment payment; subscription slots only. */
  enrollment_payment_status?: string
  /** Index in enrollment `weekly_slots`; subscription only. */
  subscription_slot_index?: number
  /** Raw slot status from weekly_slots; subscription only. e.g. 'SCHEDULED' | 'CANCELLED' | 'COMPLETED' */
  subscription_slot_status?: string
  /** True when a RESCHEDULE row exists in `cancel_reschedule_reason` for this lesson occurrence. */
  reschedule_request_submitted?: boolean
  /** Student may submit a complaint (lesson finished, within complaint window, no existing complaint). */
  can_complain?: boolean
  /** PENDING | APPROVED | REJECTED when a complaint exists. */
  complaint_status?: string
}

export type MyLessonTutorApiItem = {
  id: string
  name: string
  avatar: string
  teaches: string
  availability: string
  completed_lessons: number
  next_lesson_label: string
  /** ISO-8601 start of next lesson; format on client with viewer timezone when set. */
  next_lesson_at?: string | null
  rating_average: number
  review_count: number
}

export type MyLessonsApiResponse = {
  calendar_title: string
  week_days: MyLessonWeekDayApiItem[]
  week_hours: number[]
  current_day_index?: number
  current_hour?: number
  calendar_lessons: MyLessonApiItem[]
  upcoming_lessons: MyLessonApiItem[]
  previous_lessons: MyLessonApiItem[]
  tutors: MyLessonTutorApiItem[]
}
