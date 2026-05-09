export const reviewQueryKey = {
  tutorReviews: (tutorId: string) => ['tutor-reviews', tutorId],
  tutorAbout: (tutorId: string) => ['tutor-about', tutorId],
} as const;
