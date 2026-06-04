export type TrialLessonBookingDetailTutorDto = {
  id: string
  displayName: string
  avatarUrl: string
  subject: string
  headline: string
  timezone: string
}

export type TrialLessonBookingDetailStudentDto = {
  id: string
  displayName: string
  avatarUrl: string
  email: string
}

export type TrialLessonBookingDetailDto = {
  id: string
  startAt: string
  durationMinutes: number
  status: string
  paymentStatus: string
  grossAmount: number
  platformFee: number
  tutorAmount: number
  currency: string
  paidAt: string | null
  cancelReason: string | null
  createdAt: string
  tutor: TrialLessonBookingDetailTutorDto
  student: TrialLessonBookingDetailStudentDto
}
