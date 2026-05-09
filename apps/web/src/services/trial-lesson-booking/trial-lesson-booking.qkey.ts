export const trialLessonBookingQueryKey = {
  occupied: (tutorId: string, date: string) => ['trial-lesson-booking-occupied', tutorId, date] as const,
  alreadyBooked: (tutorId: string) => ['trial-lesson-booking-already-booked', tutorId] as const,
  currentBooking: (tutorId: string) => ['trial-lesson-booking-current-booking', tutorId] as const,
  myRequests: (status?: string, page?: number, limit?: number) =>
    ['trial-lesson-booking-my-requests', status ?? 'all', page ?? 1, limit ?? 10] as const,
  detail: (bookingId: string) => ['trial-lesson-booking-detail', bookingId] as const,
} as const
