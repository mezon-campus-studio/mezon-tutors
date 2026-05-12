import type { ETrialLessonBookingStatus } from '../enums/trial-lesson-booking'

export interface TutorTrialLessonBookingRequestDto {
  id: string
  tutorId: string
  studentId: string
  studentMezonUserId: string | null
  studentName: string
  studentAvatarUrl?: string
  startAt: string
  durationMinutes: number
  grossAmount: number
  platformFee: number
  tutorAmount: number
  status: ETrialLessonBookingStatus
  createdAt: string
}
