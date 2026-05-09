export const tutorProfileQueryKey = {
  verifiedTutors: (
    page: number,
    limit: number,
    sortBy: string,
    subject?: string,
    country?: string,
    currency?: string,
    minPrice?: number,
    maxPrice?: number
  ) => [
    'verified-tutors',
    page,
    limit,
    sortBy,
    subject,
    country,
    currency,
    minPrice,
    maxPrice,
  ],
  tutorDetail: (id: string) => ['tutor-detail', id],
  tutorAbout: (id: string) => ['tutor-about', id],
  tutorSchedule: (id: string) => ['tutor-schedule', id],
  tutorReviews: (id: string) => ['tutor-reviews', id],
  tutorResources: (id: string) => ['tutor-resources', id],
  myTutorProfile: () => ['my-tutor-profile'],
} as const
