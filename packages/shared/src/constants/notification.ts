export const NOTIFICATION_I18N_NAMESPACE = 'Notifications' as const

export const NOTIFICATION_I18N_KEYS = {
  templates: {
    bookingCreated: 'templates.bookingCreated',
    bookingConfirmed: 'templates.bookingConfirmed',
    bookingCancelled: 'templates.bookingCancelled',
    subscriptionEnrollmentConfirmed: 'templates.subscriptionEnrollmentConfirmed',
    subscriptionEnrollmentCreated: 'templates.subscriptionEnrollmentCreated',
    welcomeLinked: 'templates.welcomeLinked',
    paymentSucceeded: 'templates.paymentSucceeded',
    paymentFailed: 'templates.paymentFailed',
    systemAnnouncement: 'templates.systemAnnouncement',
    lessonStartingSoon: 'templates.lessonStartingSoon',
    tutorEarningsReleased: 'templates.tutorEarningsReleased',
  },
  titles: {
    bookingCreated: 'titles.bookingCreated',
    subscriptionEnrollmentConfirmed: 'titles.subscriptionEnrollmentConfirmed',
    subscriptionEnrollmentCreated: 'titles.subscriptionEnrollmentCreated',
    welcomeLinked: 'titles.welcomeLinked',
    paymentSucceeded: 'titles.paymentSucceeded',
    systemAnnouncement: 'titles.systemAnnouncement',
    lessonStartingSoon: 'titles.lessonStartingSoon',
    tutorEarningsReleased: 'titles.tutorEarningsReleased',
  },
} as const

export type NotificationTemplateI18nKey =
  (typeof NOTIFICATION_I18N_KEYS.templates)[keyof typeof NOTIFICATION_I18N_KEYS.templates]

export type NotificationTitleI18nKey =
  (typeof NOTIFICATION_I18N_KEYS.titles)[keyof typeof NOTIFICATION_I18N_KEYS.titles]
