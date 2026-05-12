const SUBSCRIPTION_QK_ROOT = ['subscription'] as const

export const subscriptionQueryKey = {
  root: SUBSCRIPTION_QK_ROOT,
  plansByTutor: (tutorId: string) => [...SUBSCRIPTION_QK_ROOT, 'plans', tutorId] as const,
  myPlans: [...SUBSCRIPTION_QK_ROOT, 'my-plans'] as const,
  eligibility: (tutorId: string) => [...SUBSCRIPTION_QK_ROOT, 'eligibility', tutorId] as const,
  enrollment: (id: string) => [...SUBSCRIPTION_QK_ROOT, 'enrollment', id] as const,
  tutorWeekOccurrences: (weekStart: string) =>
    [...SUBSCRIPTION_QK_ROOT, 'tutor-week-occurrences', weekStart] as const,
}
