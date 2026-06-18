/**
 * Centralized routes map for the Mezon tutors application.
 * Using constants or functions for dynamic routes ensures type safety and
 * makes refactoring easier.
 */
export const ROUTES = {
  HOME: {
    index: '/',
    events: '/#events',
  },
  EVENTS: {
    INDEX: '/events',
    CREATE: '/events/create',
    DETAIL: (slug: string) => `/events/${slug}`,
    CREATE_SUCCESS: '/events/create/success',
    EDIT: (id: string) => `/dashboard/events/${id}/edit`,
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
    LESSON_COMPLAINTS: '/admin/lesson-complaints',
    APP_SETTINGS: '/admin/app-settings',
    PAYMENTS: '/admin/payments',
    EVENTS: '/admin/events',
    EVENT_DETAIL: (id: string) => `/admin/events/${id}`,
  },
  MY_LESSONS: {
    INDEX: '/my-lessons',
  },
  PRACTICE: '/practice',
  SAVED_TUTORS: '/saved-tutors',
  DASHBOARD: {
    INDEX: '/dashboard',
    TUTOR_PROFILE: '/dashboard/tutor/profile',
    TRIAL_BOOKING: '/dashboard/tutor/trial-bookings',
    TRIAL_BOOKING_DETAIL: (id: string) => `/dashboard/tutor/trial-bookings/${id}`,
    MY_SCHEDULE: '/dashboard/tutor/my-schedule',
    TUTOR_LESSON_COMPLAINTS: '/dashboard/tutor/lesson-complaints',
    MY_LESSONS: '/dashboard/my-lesson',
    PENDING_BOOKINGS: '/dashboard/pending-bookings',
    COMPLAINTS: '/dashboard/complaints',
    WALLET: '/dashboard/wallet',
    MY_EVENTS: '/dashboard/events',
    GROUPS: '/dashboard/groups',
    SETTINGS: '/dashboard/settings',
  },
  SUPPORT: {
    ONBOARDING: '/support/onboarding',
    LEGAL_CENTER: '/support/legal-center',
    TERMS_OF_SERVICE: '/support/terms-of-service',
    PRIVACY_POLICY: '/support/privacy-policy',
    REFUND_POLICY: '/support/refund-policy',
    TUTOR_POLICY: '/support/tutor-policy',
  },
  CHECKOUT: {
    INDEX: '/checkout',
    TRIAL_LESSON: '/checkout/trial-lesson',
    SUBSCRIPTION_PLAN: '/checkout/subscription-plan',
    SUBSCRIPTION_PLAN_SCHEDULE: '/checkout/subscription-plan/schedule',
    SUCCESS: '/checkout/success',
    SUCCESS_WITH_ID: (type: 'trial' | 'subscription', id: string) => {
      const params = new URLSearchParams({ type });
      params.set(type === 'trial' ? 'bookingId' : 'enrollmentId', id);
      return `/checkout/success?${params}`;
    },
    CANCEL: '/checkout/cancel',
    CANCEL_WITH_CODE: (
      cancelCode: string,
      options?: { type?: 'trial' | 'subscription'; id?: string },
    ) => {
      const params = new URLSearchParams({ code: cancelCode });
      if (options?.type) {
        params.set('type', options.type);
      }
      if (options?.id) {
        params.set(
          options.type === 'trial' ? 'bookingId' : 'enrollmentId',
          options.id,
        );
      }
      return `/checkout/cancel?${params}`;
    },
  },
} as const;
