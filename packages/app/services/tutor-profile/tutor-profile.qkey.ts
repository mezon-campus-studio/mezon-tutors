export const tutorProfileQueryKey = {
  verifiedTutors: (
    page: number,
    limit: number,
    sortBy: string,
    subject?: string,
    country?: string,
    pricePerLesson?: string
  ) => [
    'verified-tutors',
    page,
    limit,
    sortBy,
    subject,
    country,
    pricePerLesson,
  ],
  myStatus: () => ['my-tutor-profile-status'],
  tutorDetail: (id: string) => ['tutor-detail', id],
  tutorAbout: (id: string) => ['tutor-about', id],
  tutorSchedule: (id: string) => ['tutor-schedule', id],
  tutorReviews: (id: string) => ['tutor-reviews', id],
  tutorResources: (id: string) => ['tutor-resources', id],
} as const
