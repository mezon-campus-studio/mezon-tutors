import { Injectable } from '@nestjs/common';
import { ROUTES } from '@mezon-tutors/shared';
import { ChannelMessageContent, IInteractiveMessageProps } from 'mezon-sdk';
import { AppConfigService } from './app-config.service';
import { buildEmbedMessage, buildMezonEmbedFooter } from '../utils/mezon-message';
import {
  bookingCancelledEmbed,
  bookingConfirmedEmbed,
  trialLessonBookedEmbed,
  lessonStartingSoonEmbed,
  type LessonKind,
  type LessonParty,
  type SenderAvatarParams,
  type VoiceRoomParams,
  refundCreditedEmbed,
  subscriptionEnrollmentCancelledEmbed,
  subscriptionEnrollmentConfirmedEmbed,
  systemAnnouncementEmbed,
  tutorApplicationApprovedEmbed,
  tutorApplicationRejectedEmbed,
  tutorApplicationSubmittedEmbed,
  tutorEarningsReleasedEmbed,
  welcomeLinkedEmbed,
  withdrawalCompletedEmbed,
  withdrawalRejectedEmbed,
  withdrawalRequestedEmbed,
  subscriptionEnrollmentBookedEmbed,
  lessonComplaintSubmittedEmbed,
  tutorLessonComplaintApprovedEmbed,
  studentLessonComplaintRefundedEmbed,
  studentLessonComplaintRejectedEmbed,
} from '../utils/mezon-message-templates';

@Injectable()
export class MezonMessageService {
  constructor(private readonly appConfig: AppConfigService) {}

  private get embedFooter() {
    return buildMezonEmbedFooter();
  }

  private url(path: string): string {
    const base = this.appConfig.frontendUrl.replace(/\/$/, '');
    return `${base}${path.startsWith('/') ? path : `/${path}`}`;
  }

  private toChannelMessage(embed: IInteractiveMessageProps): ChannelMessageContent {
    return buildEmbedMessage(embed, { footer: this.embedFooter });
  }

  lessonStartingSoon(
    params: {
      counterpartyName: string;
      startAtLabel: string;
      role: LessonParty;
      lessonKind?: LessonKind;
    } & SenderAvatarParams &
      VoiceRoomParams
  ): ChannelMessageContent {
    const scheduleUrl =
      params.role === 'tutor'
        ? this.url(ROUTES.DASHBOARD.MY_SCHEDULE)
        : this.url(ROUTES.MY_LESSONS.INDEX);
    return buildEmbedMessage(lessonStartingSoonEmbed({ ...params, scheduleUrl }), {
      footer: this.embedFooter,
      voiceRoom: params.voiceRoom,
    });
  }

  trialLessonBooked(
    params: {
      studentName: string;
      startAtLabel: string;
    } & SenderAvatarParams
  ): ChannelMessageContent {
    return this.toChannelMessage(
      trialLessonBookedEmbed({
        ...params,
        scheduleUrl: this.url(ROUTES.DASHBOARD.MY_SCHEDULE),
      })
    );
  }

  bookingConfirmed(
    params: {
      tutorName: string;
      startAtLabel: string;
      bookingId?: string;
    } & SenderAvatarParams
  ): ChannelMessageContent {
    const bookingPath = params.bookingId
      ? `${ROUTES.MY_LESSONS.INDEX}?booking=${params.bookingId}`
      : ROUTES.MY_LESSONS.INDEX;
    return this.toChannelMessage(
      bookingConfirmedEmbed({ ...params, bookingUrl: this.url(bookingPath) })
    );
  }

  bookingCancelled(
    params: {
      counterpartyName: string;
      startAtLabel: string;
      reason?: string;
      role: LessonParty;
    } & SenderAvatarParams
  ): ChannelMessageContent {
    return this.toChannelMessage(bookingCancelledEmbed(params));
  }

  subscriptionEnrollmentBooked(
    params: {
      studentName: string;
      planLabel: string;
      amountFormatted: string;
    } & SenderAvatarParams
  ): ChannelMessageContent {
    return this.toChannelMessage(
      subscriptionEnrollmentBookedEmbed({
        ...params,
        scheduleUrl: this.url(ROUTES.DASHBOARD.MY_SCHEDULE),
      })
    );
  }

  subscriptionEnrollmentConfirmed(
    params: {
      tutorName: string;
      planLabel: string;
      amountFormatted: string;
      enrollmentId: string;
    } & SenderAvatarParams
  ): ChannelMessageContent {
    return this.toChannelMessage(
      subscriptionEnrollmentConfirmedEmbed({
        ...params,
        enrollmentUrl: this.url(ROUTES.CHECKOUT.SUBSCRIPTION_PLAN_SUCCESS(params.enrollmentId)),
      })
    );
  }

  subscriptionEnrollmentCancelled(
    params: {
      counterpartyName: string;
      planLabel: string;
      reason?: string;
      role: LessonParty;
    } & SenderAvatarParams
  ): ChannelMessageContent {
    return this.toChannelMessage(subscriptionEnrollmentCancelledEmbed(params));
  }

  tutorEarningsReleased(params: {
    amountFormatted: string;
    lessonKind: LessonKind;
  }): ChannelMessageContent {
    return this.toChannelMessage(
      tutorEarningsReleasedEmbed({
        ...params,
        walletUrl: this.url(ROUTES.DASHBOARD.WALLET),
      })
    );
  }

  refundCredited(
    params: { amountFormatted: string; reason: string } & SenderAvatarParams
  ): ChannelMessageContent {
    return this.toChannelMessage(
      refundCreditedEmbed({
        ...params,
        walletUrl: this.url(ROUTES.DASHBOARD.WALLET),
      })
    );
  }

  withdrawalRequested(
    params: {
      tutorName: string;
      amountFormatted: string;
      bankName: string;
      bankAccountNumber?: string;
    } & SenderAvatarParams
  ): ChannelMessageContent {
    return this.toChannelMessage(
      withdrawalRequestedEmbed({
        ...params,
        reviewUrl: this.url(ROUTES.ADMIN.TUTOR_APPLICATIONS),
      })
    );
  }

  withdrawalCompleted(params: {
    amountFormatted: string;
    bankName: string;
  }): ChannelMessageContent {
    return this.toChannelMessage(
      withdrawalCompletedEmbed({
        ...params,
        walletUrl: this.url(ROUTES.DASHBOARD.WALLET),
      })
    );
  }

  withdrawalRejected(params: {
    amountFormatted: string;
    adminNote?: string;
  }): ChannelMessageContent {
    return this.toChannelMessage(
      withdrawalRejectedEmbed({
        ...params,
        walletUrl: this.url(ROUTES.DASHBOARD.WALLET),
      })
    );
  }

  tutorApplicationSubmitted(
    params: { tutorName: string; applicationId?: string } & SenderAvatarParams
  ): ChannelMessageContent {
    const reviewUrl = params.applicationId
      ? this.url(ROUTES.ADMIN.TUTOR_APPLICATION_DETAIL(params.applicationId))
      : this.url(ROUTES.ADMIN.TUTOR_APPLICATIONS);
    return this.toChannelMessage(
      tutorApplicationSubmittedEmbed({
        tutorName: params.tutorName,
        senderAvatarUrl: params.senderAvatarUrl,
        reviewUrl,
      })
    );
  }

  lessonComplaintSubmitted(
    params: {
      complaintId: string;
      studentName: string;
      tutorName: string;
      lessonStartAtLabel: string;
      reason: string;
      message?: string | null;
    } & SenderAvatarParams
  ): ChannelMessageContent {
    return this.toChannelMessage(
      lessonComplaintSubmittedEmbed({
        ...params,
        reviewUrl: this.url(ROUTES.ADMIN.LESSON_COMPLAINTS),
      })
    );
  }

  tutorLessonComplaintApproved(
    params: {
      studentName: string;
      lessonStartAtLabel: string;
      submittedAtLabel: string;
      reason: string;
      studentMessage?: string | null;
      amountFormatted: string;
    } & SenderAvatarParams
  ): ChannelMessageContent {
    return this.toChannelMessage(
      tutorLessonComplaintApprovedEmbed({
        ...params,
        walletUrl: this.url(ROUTES.DASHBOARD.WALLET),
      })
    );
  }

  studentLessonComplaintRefunded(params: {
    tutorName: string;
    lessonStartAtLabel: string;
    submittedAtLabel: string;
    reason: string;
    amountFormatted: string;
  }): ChannelMessageContent {
    return this.toChannelMessage(
      studentLessonComplaintRefundedEmbed({
        ...params,
        walletUrl: this.url(ROUTES.DASHBOARD.WALLET),
      })
    );
  }

  studentLessonComplaintRejected(params: {
    tutorName: string;
    lessonStartAtLabel: string;
    submittedAtLabel: string;
    reason: string;
    amountFormatted: string;
    adminNote?: string | null;
  }): ChannelMessageContent {
    return this.toChannelMessage(
      studentLessonComplaintRejectedEmbed({
        ...params,
        complaintsUrl: this.url(ROUTES.DASHBOARD.COMPLAINTS),
      })
    );
  }

  tutorApplicationApproved(tutorName: string): ChannelMessageContent {
    return this.toChannelMessage(
      tutorApplicationApprovedEmbed({
        tutorName,
        dashboardUrl: this.url(ROUTES.DASHBOARD.INDEX),
      })
    );
  }

  tutorApplicationRejected(params: { tutorName: string; summary: string }): ChannelMessageContent {
    return this.toChannelMessage(
      tutorApplicationRejectedEmbed({
        ...params,
        reapplyUrl: this.url(ROUTES.BECOME_TUTOR.INDEX),
      })
    );
  }

  systemAnnouncement(params: {
    title: string;
    body: string;
    actionUrl?: string;
    actionLabel?: string;
  }): ChannelMessageContent {
    return this.toChannelMessage(
      systemAnnouncementEmbed({
        ...params,
        actionUrl: params.actionUrl ? this.url(params.actionUrl) : undefined,
      })
    );
  }

  welcomeLinked(displayName: string): ChannelMessageContent {
    return this.toChannelMessage(
      welcomeLinkedEmbed({
        displayName,
        exploreUrl: this.url(ROUTES.TUTOR.INDEX),
      })
    );
  }
}
