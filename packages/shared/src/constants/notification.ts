export const NOTIFICATION_I18N_NAMESPACE = 'Notifications' as const

export const NOTIFICATION_I18N_KEYS = {
  templates: {
    bookingCreated: 'templates.bookingCreated',
    bookingConfirmed: 'templates.bookingConfirmed',
    bookingCancelled: 'templates.bookingCancelled',
    paymentSucceeded: 'templates.paymentSucceeded',
    paymentFailed: 'templates.paymentFailed',
    systemAnnouncement: 'templates.systemAnnouncement',
    lessonStartingSoon: 'templates.lessonStartingSoon',
  },
  titles: {
    bookingCreated: 'titles.bookingCreated',
    paymentSucceeded: 'titles.paymentSucceeded',
    systemAnnouncement: 'titles.systemAnnouncement',
    lessonStartingSoon: 'titles.lessonStartingSoon',
  },
} as const

export type NotificationTemplateI18nKey =
  (typeof NOTIFICATION_I18N_KEYS.templates)[keyof typeof NOTIFICATION_I18N_KEYS.templates]

export type NotificationTitleI18nKey =
  (typeof NOTIFICATION_I18N_KEYS.titles)[keyof typeof NOTIFICATION_I18N_KEYS.titles]
