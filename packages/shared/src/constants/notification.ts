import { ENotificationType } from '../enums/notification'
import { ROUTES } from './routes'

export const NOTIFICATION_I18N_NAMESPACE = 'Notifications' as const

export type NotificationMetaTone = 'positive' | 'negative'

export type NotificationLinkContext = {
  bookingId?: string | null
  enrollmentId?: string | null
  complaintId?: string | null
  role?: string | null
}

export type NotificationMetaItem = {
  type: ENotificationType
  titleKey: string
  templateKey: string
  tone: NotificationMetaTone
  borderColor: string
  resolveLink: (context?: NotificationLinkContext) => string
}

export const NOTIFICATION_META: Record<string, NotificationMetaItem> = {
  BOOKING_CREATED: {
    type: ENotificationType.BOOKING,
    titleKey: 'titles.bookingCreated',
    templateKey: 'templates.bookingCreated',
    tone: 'positive',
    borderColor: '#2563eb',
    resolveLink: (context) =>
      context?.bookingId
        ? ROUTES.DASHBOARD.TRIAL_BOOKING_DETAIL(context.bookingId)
        : ROUTES.DASHBOARD.TRIAL_BOOKING,
  },
  BOOKING_CONFIRMED: {
    type: ENotificationType.BOOKING,
    titleKey: 'titles.bookingConfirmed',
    templateKey: 'templates.bookingConfirmed',
    tone: 'positive',
    borderColor: '#0891b2',
    resolveLink: () => ROUTES.DASHBOARD.MY_LESSONS,
  },
  BOOKING_CANCELLED: {
    type: ENotificationType.BOOKING,
    titleKey: 'titles.bookingCancelled',
    templateKey: 'templates.bookingCancelled',
    tone: 'negative',
    borderColor: '#e11d48',
    resolveLink: () => ROUTES.DASHBOARD.MY_LESSONS,
  },
  SUBSCRIPTION_ENROLLMENT_CONFIRMED: {
    type: ENotificationType.PAYMENT,
    titleKey: 'titles.subscriptionEnrollmentConfirmed',
    templateKey: 'templates.subscriptionEnrollmentConfirmed',
    tone: 'positive',
    borderColor: '#059669',
    resolveLink: () => ROUTES.DASHBOARD.MY_LESSONS,
  },
  SUBSCRIPTION_ENROLLMENT_CREATED: {
    type: ENotificationType.PAYMENT,
    titleKey: 'titles.subscriptionEnrollmentCreated',
    templateKey: 'templates.subscriptionEnrollmentCreated',
    tone: 'positive',
    borderColor: '#0d9488',
    resolveLink: () => ROUTES.DASHBOARD.MY_SCHEDULE,
  },
  WELCOME_LINKED: {
    type: ENotificationType.SYSTEM,
    titleKey: 'titles.welcomeLinked',
    templateKey: 'templates.welcomeLinked',
    tone: 'positive',
    borderColor: '#7c3aed',
    resolveLink: () => ROUTES.HOME.index,
  },
  PAYMENT_SUCCEEDED: {
    type: ENotificationType.PAYMENT,
    titleKey: 'titles.paymentSucceeded',
    templateKey: 'templates.paymentSucceeded',
    tone: 'positive',
    borderColor: '#65a30d',
    resolveLink: () => ROUTES.DASHBOARD.WALLET,
  },
  PAYMENT_FAILED: {
    type: ENotificationType.PAYMENT,
    titleKey: 'titles.paymentFailed',
    templateKey: 'templates.paymentFailed',
    tone: 'negative',
    borderColor: '#dc2626',
    resolveLink: () => ROUTES.DASHBOARD.WALLET,
  },
  SYSTEM_ANNOUNCEMENT: {
    type: ENotificationType.SYSTEM,
    titleKey: 'titles.systemAnnouncement',
    templateKey: 'templates.systemAnnouncement',
    tone: 'positive',
    borderColor: '#4f46e5',
    resolveLink: () => ROUTES.DASHBOARD.INDEX,
  },
  LESSON_STARTING_SOON: {
    type: ENotificationType.LESSON_STARTING_SOON,
    titleKey: 'titles.lessonStartingSoon',
    templateKey: 'templates.lessonStartingSoon',
    tone: 'positive',
    borderColor: '#d97706',
    resolveLink: (context) =>
      context?.role === 'TUTOR' ? ROUTES.DASHBOARD.MY_SCHEDULE : ROUTES.DASHBOARD.MY_LESSONS,
  },
  TUTOR_EARNINGS_RELEASED: {
    type: ENotificationType.PAYMENT,
    titleKey: 'titles.tutorEarningsReleased',
    templateKey: 'templates.tutorEarningsReleased',
    tone: 'positive',
    borderColor: '#15803d',
    resolveLink: () => ROUTES.DASHBOARD.WALLET,
  },
  LESSON_COMPLAINT_APPROVED: {
    type: ENotificationType.SYSTEM,
    titleKey: 'titles.lessonComplaintApproved',
    templateKey: 'templates.lessonComplaintApproved',
    tone: 'positive',
    borderColor: '#c026d3',
    resolveLink: () => ROUTES.DASHBOARD.COMPLAINTS,
  },
  LESSON_COMPLAINT_APPROVED_REFUNDED: {
    type: ENotificationType.PAYMENT,
    titleKey: 'titles.lessonComplaintApproved',
    templateKey: 'templates.lessonComplaintApprovedRefunded',
    tone: 'positive',
    borderColor: '#0369a1',
    resolveLink: () => ROUTES.DASHBOARD.COMPLAINTS,
  },
  LESSON_COMPLAINT_REJECTED: {
    type: ENotificationType.SYSTEM,
    titleKey: 'titles.lessonComplaintRejected',
    templateKey: 'templates.lessonComplaintRejected',
    tone: 'negative',
    borderColor: '#c2410c',
    resolveLink: () => ROUTES.DASHBOARD.COMPLAINTS,
  },
  LESSON_COMPLAINT_TUTOR_REJECTED: {
    type: ENotificationType.SYSTEM,
    titleKey: 'titles.lessonComplaintTutorRejected',
    templateKey: 'templates.lessonComplaintTutorRejected',
    tone: 'negative',
    borderColor: '#c2410c',
    resolveLink: () => ROUTES.DASHBOARD.COMPLAINTS,
  },
  TUTOR_LESSON_COMPLAINT_APPROVED: {
    type: ENotificationType.PAYMENT,
    titleKey: 'titles.tutorLessonComplaintApproved',
    templateKey: 'templates.tutorLessonComplaintApproved',
    tone: 'negative',
    borderColor: '#be185d',
    resolveLink: () => ROUTES.DASHBOARD.WALLET,
  },
  TUTOR_LESSON_COMPLAINT_SUBMITTED: {
    type: ENotificationType.SYSTEM,
    titleKey: 'titles.tutorLessonComplaintSubmitted',
    templateKey: 'templates.tutorLessonComplaintSubmitted',
    tone: 'negative',
    borderColor: '#7c3aed',
    resolveLink: () => ROUTES.DASHBOARD.TUTOR_LESSON_COMPLAINTS,
  },
  ADMIN_WITHDRAWAL_REQUESTED: {
    type: ENotificationType.PAYMENT,
    titleKey: 'titles.adminWithdrawalRequested',
    templateKey: 'templates.adminWithdrawalRequested',
    tone: 'positive',
    borderColor: '#d97706',
    resolveLink: () => ROUTES.ADMIN.PAYMENTS,
  },
  TUTOR_WITHDRAWAL_COMPLETED: {
    type: ENotificationType.PAYMENT,
    titleKey: 'titles.tutorWithdrawalCompleted',
    templateKey: 'templates.tutorWithdrawalCompleted',
    tone: 'positive',
    borderColor: '#15803d',
    resolveLink: () => ROUTES.DASHBOARD.WALLET,
  },
  TUTOR_WITHDRAWAL_REJECTED: {
    type: ENotificationType.PAYMENT,
    titleKey: 'titles.tutorWithdrawalRejected',
    templateKey: 'templates.tutorWithdrawalRejected',
    tone: 'negative',
    borderColor: '#dc2626',
    resolveLink: () => ROUTES.DASHBOARD.WALLET,
  },
  STUDENT_WITHDRAWAL_SUBMITTED: {
    type: ENotificationType.PAYMENT,
    titleKey: 'titles.studentWithdrawalSubmitted',
    templateKey: 'templates.studentWithdrawalSubmitted',
    tone: 'positive',
    borderColor: '#7c3aed',
    resolveLink: () => ROUTES.DASHBOARD.WALLET,
  },
  STUDENT_WITHDRAWAL_COMPLETED: {
    type: ENotificationType.PAYMENT,
    titleKey: 'titles.studentWithdrawalCompleted',
    templateKey: 'templates.studentWithdrawalCompleted',
    tone: 'positive',
    borderColor: '#15803d',
    resolveLink: () => ROUTES.DASHBOARD.WALLET,
  },
  STUDENT_WITHDRAWAL_REJECTED: {
    type: ENotificationType.PAYMENT,
    titleKey: 'titles.studentWithdrawalRejected',
    templateKey: 'templates.studentWithdrawalRejected',
    tone: 'negative',
    borderColor: '#dc2626',
    resolveLink: () => ROUTES.DASHBOARD.WALLET,
  },
}
