import { IInteractiveMessageProps } from 'mezon-sdk';
import { embedAdminThumbnail, embedSenderThumbnail, MEZON_EMBED_COLORS } from './mezon-message';

export type SenderAvatarParams = { senderAvatarUrl?: string | null };

export type VoiceRoomParams = {
  voiceRoom?: { id: string; name: string } | null;
};

export type LessonParty = 'student' | 'tutor';
export type LessonKind = 'trial' | 'subscription';

const lessonKindLabel = (kind: LessonKind) =>
  kind === 'trial' ? 'Trial lesson' : 'Subscription lesson';

const lessonStartingSoonDescription = (
  counterpartyName: string,
  lessonKind?: LessonKind
): string => {
  const lessonPhrase = lessonKind ? `${lessonKindLabel(lessonKind).toLowerCase()} ` : '';
  return `Your ${lessonPhrase}lesson with ${counterpartyName} starts in about 10 minutes.`;
};

export const lessonStartingSoonEmbed = (
  params: {
    counterpartyName: string;
    startAtLabel: string;
    role: LessonParty;
    lessonKind?: LessonKind;
    scheduleUrl?: string;
  } & SenderAvatarParams &
    VoiceRoomParams
): IInteractiveMessageProps => ({
  color: MEZON_EMBED_COLORS.warning,
  title: 'Lesson starting soon',
  description: lessonStartingSoonDescription(params.counterpartyName, params.lessonKind),
  fields: [
    { name: 'With', value: params.counterpartyName, inline: true },
    { name: 'Start time', value: params.startAtLabel, inline: true },
    ...(params.lessonKind
      ? [{ name: 'Type', value: lessonKindLabel(params.lessonKind), inline: true }]
      : []),
  ],
  url: params.scheduleUrl,
  ...embedSenderThumbnail(params.senderAvatarUrl),
});

export const trialLessonBookedEmbed = (
  params: {
    studentName: string;
    startAtLabel: string;
    scheduleUrl?: string;
  } & SenderAvatarParams
): IInteractiveMessageProps => ({
  color: MEZON_EMBED_COLORS.success,
  title: 'New trial lesson booking',
  description: `${params.studentName} paid for a trial lesson with you.`,
  fields: [
    { name: 'Student', value: params.studentName, inline: true },
    { name: 'When', value: params.startAtLabel, inline: true },
  ],
  url: params.scheduleUrl,
  ...embedSenderThumbnail(params.senderAvatarUrl),
});

export const bookingConfirmedEmbed = (
  params: {
    tutorName: string;
    startAtLabel: string;
    bookingUrl?: string;
  } & SenderAvatarParams
): IInteractiveMessageProps => ({
    color: MEZON_EMBED_COLORS.success,
    title: 'Trial lesson confirmed',
    description: `Your trial lesson with ${params.tutorName} is confirmed.`,
    fields: [
      { name: 'Tutor', value: params.tutorName, inline: true },
      { name: 'When', value: params.startAtLabel, inline: true },
    ],
    url: params.bookingUrl,
    ...embedSenderThumbnail(params.senderAvatarUrl),
  });

export const bookingCancelledEmbed = (
  params: {
    counterpartyName: string;
    startAtLabel: string;
    reason?: string;
    role: LessonParty;
  } & SenderAvatarParams
): IInteractiveMessageProps => ({
    color: MEZON_EMBED_COLORS.error,
    title: 'Lesson cancelled',
    description: `Your lesson with ${params.counterpartyName} on ${params.startAtLabel} has been cancelled.`,
    fields: [
      { name: 'With', value: params.counterpartyName, inline: true },
      { name: 'Was scheduled', value: params.startAtLabel, inline: true },
      ...(params.reason ? [{ name: 'Reason', value: params.reason, inline: false }] : []),
    ],
    ...embedSenderThumbnail(params.senderAvatarUrl),
  });

export const tutorEarningsReleasedEmbed = (
  params: {
    amountFormatted: string;
    lessonKind: 'trial' | 'subscription';
    walletUrl?: string;
  }
): IInteractiveMessageProps => ({
    color: MEZON_EMBED_COLORS.success,
    title: 'Earnings available',
    description:
      params.lessonKind === 'trial'
        ? `${params.amountFormatted} from your trial lesson is now in your wallet.`
        : `${params.amountFormatted} from your subscription lesson is now in your wallet.`,
    fields: [
      { name: 'Amount', value: params.amountFormatted, inline: true },
      {
        name: 'Lesson type',
        value: params.lessonKind === 'trial' ? 'Trial lesson' : 'Subscription lesson',
        inline: true,
      },
    ],
    url: params.walletUrl,
    ...embedAdminThumbnail(),
  });

export const tutorApplicationApprovedEmbed = (params: {
  tutorName: string;
  dashboardUrl: string;
}): IInteractiveMessageProps => ({
  color: MEZON_EMBED_COLORS.success,
  title: 'Welcome aboard!',
  description: `Hi ${params.tutorName}, your tutor profile has been approved. You can now start teaching students.`,
  url: params.dashboardUrl,
  ...embedAdminThumbnail(),
});

export const tutorApplicationRejectedEmbed = (params: {
  tutorName: string;
  summary: string;
  reapplyUrl?: string;
}): IInteractiveMessageProps => ({
  color: MEZON_EMBED_COLORS.error,
  title: 'Application update',
  description: `Hi ${params.tutorName}, thank you for applying. Unfortunately we could not approve your profile at this time. Please review the feedback and update your profile.`,
  fields: [{ name: 'Feedback', value: params.summary, inline: false }],
  url: params.reapplyUrl,
  ...embedAdminThumbnail(),
});

export const systemAnnouncementEmbed = (params: {
  title: string;
  body: string;
  actionUrl?: string;
  actionLabel?: string;
}): IInteractiveMessageProps => ({
  color: MEZON_EMBED_COLORS.primary,
  title: params.title,
  description: params.body,
  url: params.actionUrl,
  ...(params.actionLabel
    ? { fields: [{ name: 'Action', value: params.actionLabel, inline: false }] }
    : {}),
  ...embedAdminThumbnail(),
});

export const welcomeLinkedEmbed = (
  params: {
    displayName: string;
    exploreUrl: string;
  }
): IInteractiveMessageProps => ({
  color: MEZON_EMBED_COLORS.primary,
  title: 'Welcome to Mezonly',
  description: `Hi ${params.displayName}! Your Mezon account is linked. Browse tutors, book a lesson, or manage your schedule.`,
  url: params.exploreUrl,
  ...embedAdminThumbnail(),
});


export const subscriptionEnrollmentBookedEmbed = (
  params: {
    studentName: string;
    planLabel: string;
    amountFormatted: string;
    scheduleUrl?: string;
  } & SenderAvatarParams
): IInteractiveMessageProps => ({
  color: MEZON_EMBED_COLORS.success,
  title: 'New subscription enrollment',
  description: `${params.studentName} enrolled in your ${params.planLabel} plan.`,
  fields: [
    { name: 'Student', value: params.studentName, inline: true },
    { name: 'Plan', value: params.planLabel, inline: true },
    { name: 'Paid', value: params.amountFormatted, inline: true },
  ],
  url: params.scheduleUrl,
  ...embedSenderThumbnail(params.senderAvatarUrl),
});

export const subscriptionEnrollmentConfirmedEmbed = (
  params: {
    tutorName: string;
    planLabel: string;
    amountFormatted: string;
    enrollmentUrl?: string;
  } & SenderAvatarParams
): IInteractiveMessageProps => ({
  color: MEZON_EMBED_COLORS.success,
  title: 'Subscription active',
  description: `Your subscription with ${params.tutorName} is now active. Your weekly lessons are scheduled.`,
  fields: [
    { name: 'Tutor', value: params.tutorName, inline: true },
    { name: 'Plan', value: params.planLabel, inline: true },
    { name: 'Paid', value: params.amountFormatted, inline: true },
  ],
  url: params.enrollmentUrl,
  ...embedSenderThumbnail(params.senderAvatarUrl),
});

export const subscriptionEnrollmentCancelledEmbed = (
  params: {
    counterpartyName: string;
    planLabel: string;
    reason?: string;
    role: LessonParty;
  } & SenderAvatarParams
): IInteractiveMessageProps => ({
  color: MEZON_EMBED_COLORS.error,
  title: 'Subscription cancelled',
  description:
    params.role === 'student'
      ? `Your subscription with ${params.counterpartyName} (${params.planLabel}) has been cancelled.`
      : `The subscription from ${params.counterpartyName} (${params.planLabel}) has been cancelled.`,
  fields: [
    {
      name: params.role === 'student' ? 'Tutor' : 'Student',
      value: params.counterpartyName,
      inline: true,
    },
    { name: 'Plan', value: params.planLabel, inline: true },
    ...(params.reason ? [{ name: 'Reason', value: params.reason, inline: false }] : []),
  ],
  ...embedSenderThumbnail(params.senderAvatarUrl),
});

export const refundCreditedEmbed = (
  params: {
    amountFormatted: string;
    reason: string;
    walletUrl?: string;
  } & SenderAvatarParams
): IInteractiveMessageProps => ({
  color: MEZON_EMBED_COLORS.info,
  title: 'Refund credited',
  description: `${params.amountFormatted} has been added to your wallet balance.`,
  fields: [{ name: 'Details', value: params.reason, inline: false }],
  url: params.walletUrl,
  ...embedSenderThumbnail(params.senderAvatarUrl),
});

export const withdrawalRequestedEmbed = (
  params: {
    tutorName: string;
    amountFormatted: string;
    bankName: string;
    bankAccountNumber?: string;
    reviewUrl?: string;
  } & SenderAvatarParams
): IInteractiveMessageProps => ({
  color: MEZON_EMBED_COLORS.warning,
  title: 'New withdrawal request',
  description: `${params.tutorName} requested a payout. Please review and process it in the admin panel.`,
  fields: [
    { name: 'Tutor', value: params.tutorName, inline: true },
    { name: 'Amount', value: params.amountFormatted, inline: true },
    { name: 'Bank', value: params.bankName, inline: true },
    ...(params.bankAccountNumber
      ? [{ name: 'Account', value: params.bankAccountNumber, inline: false }]
      : []),
  ],
  url: params.reviewUrl,
  ...embedSenderThumbnail(params.senderAvatarUrl),
});

export const withdrawalCompletedEmbed = (params: {
  amountFormatted: string;
  bankName: string;
  walletUrl?: string;
}): IInteractiveMessageProps => ({
  color: MEZON_EMBED_COLORS.success,
  title: 'Withdrawal completed',
  description: 'Your payout has been processed successfully.',
  fields: [
    { name: 'Amount', value: params.amountFormatted, inline: true },
    { name: 'Bank', value: params.bankName, inline: true },
  ],
  url: params.walletUrl,
  ...embedAdminThumbnail(),
});

export const withdrawalRejectedEmbed = (params: {
  amountFormatted: string;
  adminNote?: string;
  walletUrl?: string;
}): IInteractiveMessageProps => ({
  color: MEZON_EMBED_COLORS.error,
  title: 'Withdrawal declined',
  description: 'Your withdrawal request could not be processed. The amount has been returned to your available balance.',
  fields: [
    { name: 'Amount', value: params.amountFormatted, inline: true },
    ...(params.adminNote ? [{ name: 'Note', value: params.adminNote, inline: false }] : []),
  ],
  url: params.walletUrl,
  ...embedAdminThumbnail(),
});

export const tutorApplicationSubmittedEmbed = (
  params: {
    tutorName: string;
    reviewUrl?: string;
  } & SenderAvatarParams
): IInteractiveMessageProps => ({
  color: MEZON_EMBED_COLORS.warning,
  title: 'New tutor application',
  description: `${params.tutorName} submitted a tutor application and is waiting for your review.`,
  fields: [{ name: 'Applicant', value: params.tutorName, inline: true }],
  url: params.reviewUrl,
  ...embedSenderThumbnail(params.senderAvatarUrl),
});

export const lessonComplaintSubmittedEmbed = (
  params: {
    complaintId: string;
    studentName: string;
    tutorName: string;
    lessonStartAtLabel: string;
    reason: string;
    message?: string | null;
    reviewUrl?: string;
  } & SenderAvatarParams
): IInteractiveMessageProps => ({
  color: MEZON_EMBED_COLORS.warning,
  title: 'New lesson complaint',
  description: `${params.studentName} submitted a complaint for a lesson with ${params.tutorName}.`,
  fields: [
    { name: 'Student', value: params.studentName, inline: true },
    { name: 'Tutor', value: params.tutorName, inline: true },
    { name: 'Lesson start', value: params.lessonStartAtLabel, inline: false },
    { name: 'Reason', value: params.reason, inline: false },
    ...(params.message?.trim()
      ? [{ name: 'Message', value: params.message.trim().slice(0, 500), inline: false }]
      : []),
    { name: 'Complaint ID', value: params.complaintId, inline: false },
  ],
  url: params.reviewUrl,
  ...embedSenderThumbnail(params.senderAvatarUrl),
});

export const tutorLessonComplaintApprovedEmbed = (
  params: {
    studentName: string;
    lessonStartAtLabel: string;
    submittedAtLabel: string;
    reason: string;
    studentMessage?: string | null;
    amountFormatted: string;
    walletUrl?: string;
  } & SenderAvatarParams
): IInteractiveMessageProps => ({
  color: MEZON_EMBED_COLORS.warning,
  title: 'Lesson complaint approved',
  description: `A student complaint about your lesson with ${params.studentName} was approved. ${params.amountFormatted} has been deducted from your earnings.`,
  fields: [
    { name: 'Student', value: params.studentName, inline: true },
    { name: 'Lesson time', value: params.lessonStartAtLabel, inline: true },
    { name: 'Submitted at', value: params.submittedAtLabel, inline: true },
    { name: 'Reason', value: params.reason, inline: false },
    ...(params.studentMessage?.trim()
      ? [{ name: 'Student note', value: params.studentMessage.trim().slice(0, 500), inline: false }]
      : []),
    { name: 'Amount adjusted', value: params.amountFormatted, inline: true },
  ],
  url: params.walletUrl,
  ...embedSenderThumbnail(params.senderAvatarUrl),
});

export const studentLessonComplaintRefundedEmbed = (params: {
  tutorName: string;
  lessonStartAtLabel: string;
  submittedAtLabel: string;
  reason: string;
  amountFormatted: string;
  walletUrl?: string;
}): IInteractiveMessageProps => ({
  color: MEZON_EMBED_COLORS.success,
  title: 'Complaint approved and refunded',
  description: `Your complaint about ${params.tutorName} was approved. ${params.amountFormatted} has been refunded to your wallet.`,
  fields: [
    { name: 'Tutor', value: params.tutorName, inline: true },
    { name: 'Lesson time', value: params.lessonStartAtLabel, inline: true },
    { name: 'Submitted at', value: params.submittedAtLabel, inline: true },
    { name: 'Reason', value: params.reason, inline: false },
    { name: 'Refund amount', value: params.amountFormatted, inline: true },
  ],
  url: params.walletUrl,
  ...embedAdminThumbnail(),
});

export const studentLessonComplaintRejectedEmbed = (params: {
  tutorName: string;
  lessonStartAtLabel: string;
  submittedAtLabel: string;
  reason: string;
  amountFormatted: string;
  adminNote?: string | null;
  complaintsUrl?: string;
}): IInteractiveMessageProps => {
  const adminNoteText = params.adminNote?.trim() || 'No additional note from admin.';
  return {
    color: MEZON_EMBED_COLORS.error,
    title: 'Complaint rejected',
    description: `Your complaint about ${params.tutorName} was rejected. See the admin note below for details.`,
    fields: [
      { name: 'Tutor', value: params.tutorName, inline: true },
      { name: 'Lesson time', value: params.lessonStartAtLabel, inline: true },
      { name: 'Submitted at', value: params.submittedAtLabel, inline: true },
      { name: 'Reason', value: params.reason, inline: false },
      { name: 'Amount', value: params.amountFormatted, inline: true },
      { name: 'Admin note', value: adminNoteText.slice(0, 500), inline: false },
    ],
    url: params.complaintsUrl,
    ...embedAdminThumbnail(),
  };
};
