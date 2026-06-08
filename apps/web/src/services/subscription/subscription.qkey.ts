const SUBSCRIPTION_QK_ROOT = ["subscription"] as const;

export const subscriptionQueryKey = {
  root: SUBSCRIPTION_QK_ROOT,
  plansByTutor: (tutorId: string) =>
    [...SUBSCRIPTION_QK_ROOT, "plans", tutorId] as const,
  eligibility: (tutorId: string) =>
    [...SUBSCRIPTION_QK_ROOT, "eligibility", tutorId] as const,
  enrollment: (id: string) =>
    [...SUBSCRIPTION_QK_ROOT, "enrollment", id] as const,
  pendingPayments: () =>
    [...SUBSCRIPTION_QK_ROOT, "pending-payments"] as const,
  tutorWeekOccurrences: (weekStart: string, timezone: string) =>
    [
      ...SUBSCRIPTION_QK_ROOT,
      "tutor-week-occurrences",
      weekStart,
      timezone,
    ] as const,
  tutorCancelledLessons: () =>
    [...SUBSCRIPTION_QK_ROOT, "tutor-cancelled-lessons"] as const,
  rescheduleOptions: (
    enrollmentId: string,
    slotIndex: number,
    weekStart: string,
    timezone: string,
  ) =>
    [
      ...SUBSCRIPTION_QK_ROOT,
      "reschedule-options",
      enrollmentId,
      slotIndex,
      weekStart,
      timezone,
    ] as const,
};
