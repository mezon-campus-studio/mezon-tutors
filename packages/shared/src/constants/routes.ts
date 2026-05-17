/**
 * Centralized routes map for the Mezon tutors application.
 * Using constants or functions for dynamic routes ensures type safety and
 * makes refactoring easier.
 */
export const ROUTES = {
  HOME: {
    index: '/',
  },
  TUTOR: {
    INDEX: '/tutors',
    DETAIL: (id: string | number) => `/tutors/${id}`,
  },
  BECOME_TUTOR: {
    INDEX: '/become-tutor',
    PHOTO: '/become-tutor/photo',
    CERTIFICATION: '/become-tutor/certification',
    VIDEO: '/become-tutor/video',
    AVAILABILITY: '/become-tutor/availability',
    FINAL: '/become-tutor/final',
  },
  ADMIN: {
    TUTOR_APPLICATIONS: '/admin/tutor-applications',
    TUTOR_APPLICATION_DETAIL: (id: string | number) =>
      `/admin/tutor-applications/${id}`,
  },
  AUTH: {
    MEZON_CALLBACK: '/auth/mezon/callback',
  },
  MY_LESSONS: {
    INDEX: '/my-lessons',
  },
  DASHBOARD: {
    INDEX: '/dashboard',
    TRIAL_BOOKING: '/dashboard/tutor/trial-bookings',
    TRIAL_BOOKING_DETAIL: (id: string) => `/dashboard/tutor/trial-bookings/${id}`,
    MY_SCHEDULE: '/dashboard/tutor/my-schedule',
    MY_LESSONS: '/dashboard/my-lesson',
    WALLET: '/dashboard/wallet',
  },
  CHECKOUT: {
    TRIAL_LESSON: '/checkout/trial-lesson',
    TRIAL_LESSON_SUCCESS: (bookingId: string) => `/checkout/trial-lesson/success/${bookingId}`,
    TRIAL_LESSON_CANCEL: '/checkout/trial-lesson/cancel',
    TRIAL_LESSON_CANCEL_WITH_CODE: (cancelCode: string) =>
      `/checkout/trial-lesson/cancel?code=${encodeURIComponent(cancelCode)}`,
    SUBSCRIPTION_PLAN: '/checkout/subscription-plan',
    SUBSCRIPTION_PLAN_SCHEDULE: '/checkout/subscription-plan/schedule',
    SUBSCRIPTION_PLAN_SUCCESS: (enrollmentId: string) =>
      `/checkout/subscription-plan/success/${enrollmentId}`,
    SUBSCRIPTION_PLAN_CANCEL: '/checkout/subscription-plan/cancel',
    SUBSCRIPTION_PLAN_CANCEL_WITH_CODE: (cancelCode: string) =>
      `/checkout/subscription-plan/cancel?code=${encodeURIComponent(cancelCode)}`,
  },
} as const;
