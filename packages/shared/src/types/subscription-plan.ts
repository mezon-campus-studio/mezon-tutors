import type { ECurrency } from "../enums/currency"
import type { ESubscriptionLessonSlotStatus } from "../enums/subscription-lesson-slot"

export interface TutorSubscriptionPlanPriceDto {
  baseCurrency: ECurrency
  usd: number
  vnd: number
  php: number
}

export interface TutorSubscriptionPlanDto {
  id: string
  tutorId: string
  lessonsPerWeek: number
  price: TutorSubscriptionPlanPriceDto
}

export type SubscriptionEligibilityReason =
  | "TRIAL_NOT_COMPLETED"
  | "NO_TRIAL_PRICE"
  | "ALREADY_ENROLLED"
  | "NOT_FOUND"

export interface SubscriptionEligibilityDto {
  eligible: boolean
  reason: SubscriptionEligibilityReason | null
  trialStatus: string | null
  trialPaymentStatus: string | null
}

export interface SubscriptionWeeklySlotDto {
  dayOfWeek: number
  startTime: string
  durationMinutes: number
  date?: string
  status?: ESubscriptionLessonSlotStatus
}

export interface CreateSubscriptionEnrollmentSlotDto {
  date: string
  startTime: string
  endTime: string
}

export interface CreateSubscriptionEnrollmentDto {
  tutorId: string
  lessonsPerWeek: number
  currency: ECurrency
  slots: CreateSubscriptionEnrollmentSlotDto[]
}

export interface SubscriptionEnrollmentDto {
  id: string
  tutorId: string
  lessonsPerWeek: number
  status: string
  weeklySlots: SubscriptionWeeklySlotDto[]
  currency: ECurrency | null
  createdAt: string
  grossAmount: number
  platformFee: number
  tutorAmount: number
  paymentStatus: string
  paymentRef: string | null
  paymentUrl: string | null
  paidAt: string | null
}

export interface SubscriptionEnrollmentDetailDto extends SubscriptionEnrollmentDto {
  tutor: { id: string; displayName: string; avatarUrl: string | null }
}

export interface TutorSubscriptionWeekOccurrenceDto {
  scheduleKind: "subscription"
  id: string
  enrollmentId: string
  slotIndex: number
  studentId: string
  studentMezonUserId: string | null
  studentName: string
  studentAvatarUrl: string | null
  tutorProfileId: string
  startAt: string
  durationMinutes: number
  rescheduleRequestSubmitted?: boolean
}

export type TutorSubscriptionSlotRescheduleRequestResult = {
  success: boolean
  logId: string
}
