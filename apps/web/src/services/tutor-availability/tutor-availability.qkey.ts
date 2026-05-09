export const tutorAvailabilityQueryKey = {
  byTutor: (tutorId: string) => ['tutor-availability', tutorId] as const,
} as const
