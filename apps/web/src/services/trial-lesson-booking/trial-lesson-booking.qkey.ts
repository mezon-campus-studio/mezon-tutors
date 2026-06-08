export const trialLessonBookingQueryKey = {
  occupied: (tutorId: string, date: string, timezone: string, excludeBookingId?: string) =>
    [
      "trial-lesson-booking-occupied",
      tutorId,
      date,
      timezone,
      excludeBookingId ?? "",
    ] as const,
  occupiedWeek: (
    tutorId: string,
    weekStartDate: string,
    timezone: string,
    excludeBookingId?: string,
  ) =>
    [
      "trial-lesson-booking-occupied-week",
      tutorId,
      weekStartDate,
      timezone,
      excludeBookingId ?? "",
    ] as const,
  studentOccupiedWeek: (
    weekStartDate: string,
    timezone: string,
    excludeBookingId?: string,
    excludeEnrollmentId?: string,
    excludeSlotIndex?: number,
  ) =>
    [
      "trial-lesson-booking-student-occupied-week",
      weekStartDate,
      timezone,
      excludeBookingId ?? "",
      excludeEnrollmentId ?? "",
      excludeSlotIndex ?? "",
    ] as const,
  alreadyBooked: (tutorId: string) =>
    ["trial-lesson-booking-already-booked", tutorId] as const,
  currentBooking: (tutorId: string) =>
    ["trial-lesson-booking-current-booking", tutorId] as const,
  pendingPayments: () => ["trial-lesson-booking-pending-payments"] as const,
  myRequests: (status?: string, page?: number, limit?: number) =>
    [
      "trial-lesson-booking-my-requests",
      status ?? "all",
      page ?? 1,
      limit ?? 10,
    ] as const,
  detail: (bookingId: string) =>
    ["trial-lesson-booking-detail", bookingId] as const,
} as const;
