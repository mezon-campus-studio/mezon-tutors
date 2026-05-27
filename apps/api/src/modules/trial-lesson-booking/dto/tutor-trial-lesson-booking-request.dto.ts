import { ETrialLessonStatus } from '@mezon-tutors/db'

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
  currency: string
  status: ETrialLessonStatus
  createdAt: string
  rescheduleRequestSubmitted: boolean
}
