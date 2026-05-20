import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { ECurrency, ENotificationType, Prisma } from '@mezon-tutors/db'
import { ChannelMessageContent } from 'mezon-sdk'
import { ECurrency as SharedCurrency, formatToCurrency, NOTIFICATION_I18N_KEYS } from '@mezon-tutors/shared'
import dayjs = require('dayjs')
import utc = require('dayjs/plugin/utc')
import timezone = require('dayjs/plugin/timezone')
import { PrismaService } from '../../prisma/prisma.service'
import { AppConfigService } from '../../shared/services/app-config.service'
import { MezonMessageService } from '../../shared/services/mezon-message'
import { MezonBotService } from '../mezon-bot/mezon-bot.service'
import { CreateNotificationDto } from './dto/create-notification.dto'
import { GetMyNotificationsDto } from './dto/get-my-notifications.dto'

dayjs.extend(utc)
dayjs.extend(timezone)

type MyNotificationItem = {
  id: string
  title: string
  content: string
  type: ENotificationType
  i18nKey: string | null
  i18nParams: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
  isRead: boolean
  createdAt: string
}

type PrismaTx = Prisma.TransactionClient

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly appConfig: AppConfigService,
    private readonly mezonBotService: MezonBotService,
    private readonly mezonMessageService: MezonMessageService
  ) {}

  private async sendAdminMezonDm(
    message: ChannelMessageContent,
    context: string
  ): Promise<void> {
    const adminMezonId = this.appConfig.adminMezonId
    if (!adminMezonId) {
      this.logger.warn(`ADMIN_MEZON_ID is not set; skipping admin DM (${context})`)
      return
    }
    if (!this.mezonBotService.isConfigured()) {
      this.logger.warn(`Mezon bot is not configured; skipping admin DM (${context})`)
      return
    }

    try {
      await this.mezonBotService.sendDMToUser(adminMezonId, message)
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      this.logger.warn(`Failed to send admin Mezon DM (${context}): ${detail}`)
    }
  }

  private formatStartAt(startAt: Date, timezoneName?: string | null): string {
    const tz = timezoneName?.trim() || 'UTC'
    return dayjs(startAt).tz(tz).format('ddd, D MMM YYYY · HH:mm')
  }

  private subscriptionPlanLabel(lessonsPerWeek: number): string {
    return `${lessonsPerWeek} lesson${lessonsPerWeek === 1 ? '' : 's'}/week`
  }

  private async notifyInAppAndMezon(params: {
    userId: string
    mezonUserId?: string | null
    dedupeKey: string
    notification: CreateNotificationDto
    mezonMessage?: ChannelMessageContent
  }): Promise<void> {
    try {
      await this.createForUser(params.userId, {
        ...params.notification,
        dedupeKey: params.dedupeKey,
      })
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      this.logger.warn(`Failed to create in-app notification (${params.dedupeKey}): ${detail}`)
    }

    if (!params.mezonMessage) {
      return
    }

    const mezonUserId = params.mezonUserId?.trim()
    if (!mezonUserId) {
      return
    }
    if (!this.mezonBotService.isConfigured()) {
      this.logger.warn(`Mezon bot is not configured; skipping DM (${params.dedupeKey})`)
      return
    }

    try {
      await this.mezonBotService.sendDMToUser(mezonUserId, params.mezonMessage)
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      this.logger.warn(`Failed to send Mezon DM (${params.dedupeKey}): ${detail}`)
    }
  }

  async notifyWelcomeLinked(params: {
    userId: string
    mezonUserId?: string | null
    displayName: string
  }): Promise<void> {
    const displayName = params.displayName.trim() || 'there'
    await this.notifyInAppAndMezon({
      userId: params.userId,
      mezonUserId: params.mezonUserId,
      dedupeKey: `welcome-linked:${params.userId}`,
      notification: {
        title: 'Welcome to Mezonly',
        content: `Welcome, ${displayName}! Your Mezon account is linked.`,
        type: ENotificationType.SYSTEM,
        i18nKey: NOTIFICATION_I18N_KEYS.templates.welcomeLinked,
        i18nParams: { displayName },
        metadata: {
          titleI18nKey: NOTIFICATION_I18N_KEYS.titles.welcomeLinked,
          titleI18nParams: {},
        },
      },
      mezonMessage: this.mezonMessageService.welcomeLinked(displayName),
    })
  }

  async createForUser(userId: string, data: CreateNotificationDto, tx?: PrismaTx): Promise<void> {
    await this.createForMany([userId], data, tx)
  }

  async createForMany(userIds: string[], data: CreateNotificationDto, tx?: PrismaTx): Promise<void> {
    const uniqueUserIds = [...new Set(userIds)]
    if (!uniqueUserIds.length) return

    const runCreate = async (transaction: PrismaTx) => {
      if (data.dedupeKey) {
        const existingNotification = await transaction.notification.findUnique({
          where: { dedupeKey: data.dedupeKey },
          select: { id: true },
        })
        if (existingNotification) return
      }

      const notification = await transaction.notification.create({
        data: {
          title: data.title,
          content: data.content,
          type: data.type,
          i18nKey: data.i18nKey,
          i18nParams: (data.i18nParams ?? undefined) as Prisma.InputJsonValue | undefined,
          dedupeKey: data.dedupeKey,
          metadata: (data.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        },
        select: { id: true },
      })

      await transaction.notificationRecipient.createMany({
        data: uniqueUserIds.map((userId) => ({
          notificationId: notification.id,
          userId,
        })),
      })
    }

    if (tx) {
      await runCreate(tx)
      return
    }

    await this.prisma.$transaction(async (transaction) => {
      await runCreate(transaction)
    })
  }

  async getMyNotifications(userId: string, pagination: GetMyNotificationsDto) {
    const { skip, take } = pagination
    const [total, recipients] = await this.prisma.$transaction([
      this.prisma.notificationRecipient.count({ where: { userId } }),
      this.prisma.notificationRecipient.findMany({
        where: { userId },
        select: {
          id: true,
          isRead: true,
          notification: {
            select: {
              id: true,
              title: true,
              content: true,
              type: true,
              i18nKey: true,
              i18nParams: true,
              metadata: true,
              createdAt: true,
            },
          },
        },
        orderBy: { notification: { createdAt: 'desc' } },
        skip,
        take,
      }),
    ])

    const items: MyNotificationItem[] = recipients.map((recipient) => ({
      id: recipient.id,
      title: recipient.notification.title,
      content: recipient.notification.content,
      type: recipient.notification.type,
      i18nKey: recipient.notification.i18nKey,
      i18nParams: (recipient.notification.i18nParams as Record<string, unknown> | null) ?? null,
      metadata: (recipient.notification.metadata as Record<string, unknown> | null) ?? null,
      isRead: recipient.isRead,
      createdAt: recipient.notification.createdAt.toISOString(),
    }))

    const nextSkip = skip + items.length
    const hasMore = nextSkip < total

    return {
      items,
      pagination: {
        skip,
        take,
        total,
        hasMore,
        nextSkip: hasMore ? nextSkip : null,
      },
    }
  }

  async markAsRead(recipientId: string, userId: string): Promise<void> {
    const recipient = await this.prisma.notificationRecipient.findUnique({
      where: { id: recipientId },
      select: { id: true, userId: true, isRead: true },
    })

    if (!recipient || recipient.userId !== userId) {
      throw new NotFoundException('Notification recipient not found')
    }

    if (recipient.isRead) return

    await this.prisma.notificationRecipient.update({
      where: { id: recipientId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    })
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.prisma.notificationRecipient.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    })
  }

  async getUnreadCount(userId: string) {
    const unreadCount = await this.prisma.notificationRecipient.count({
      where: { userId, isRead: false },
    })

    return { unreadCount }
  }

  async notifyStudentBookingConfirmed(params: {
    studentId: string
    bookingId: string
    tutorProfileId: string
  }): Promise<void> {
    const booking = await this.prisma.trialLessonBooking.findUnique({
      where: { id: params.bookingId },
      select: { startAt: true },
    })
    if (!booking) {
      this.logger.warn(`Booking not found for notification ${params.bookingId}`)
      return
    }

    const [tutor, student] = await Promise.all([
      this.prisma.tutorProfile.findUnique({
        where: { id: params.tutorProfileId },
        select: {
          userId: true,
          firstName: true,
          lastName: true,
          user: { select: { avatar: true, timezone: true, mezonUserId: true } },
        },
      }),
      this.prisma.user.findUnique({
        where: { id: params.studentId },
        select: { username: true, avatar: true, timezone: true, mezonUserId: true },
      }),
    ])

    if (!tutor) {
      this.logger.warn(`Tutor profile not found for booking ${params.bookingId}`)
      return
    }

    const tutorName =
      `${tutor.firstName ?? ''} ${tutor.lastName ?? ''}`.trim() || 'your tutor'
    const studentName = student?.username ?? 'A student'
    const startAtLabel = this.formatStartAt(
      booking.startAt,
      student?.timezone ?? tutor.user.timezone
    )

    await Promise.allSettled([
      this.notifyInAppAndMezon({
        userId: params.studentId,
        mezonUserId: student?.mezonUserId,
        dedupeKey: `trial-booking-confirmed:${params.bookingId}`,
        notification: {
          title: 'Trial lesson confirmed',
          content: `Your trial lesson with ${tutorName} is confirmed.`,
          type: ENotificationType.BOOKING,
          i18nKey: NOTIFICATION_I18N_KEYS.templates.bookingConfirmed,
          i18nParams: { tutorName },
          metadata: { bookingId: params.bookingId },
        },
        mezonMessage: this.mezonMessageService.bookingConfirmed({
          tutorName,
          startAtLabel,
          bookingId: params.bookingId,
          senderAvatarUrl: tutor.user.avatar,
        }),
      }),
      this.notifyInAppAndMezon({
        userId: tutor.userId,
        mezonUserId: tutor.user.mezonUserId,
        dedupeKey: `trial-booking-paid:${params.bookingId}`,
        notification: {
          title: 'New trial lesson booking',
          content: `${studentName} paid for a trial lesson with you. Check your schedule and get ready to teach.`,
          type: ENotificationType.BOOKING,
          i18nKey: NOTIFICATION_I18N_KEYS.templates.bookingCreated,
          i18nParams: { studentName },
          metadata: {
            titleI18nKey: NOTIFICATION_I18N_KEYS.titles.bookingCreated,
            titleI18nParams: {},
            bookingId: params.bookingId,
            studentId: params.studentId,
            tutorId: params.tutorProfileId,
          },
        },
        mezonMessage: this.mezonMessageService.trialLessonBooked({
          studentName,
          startAtLabel: this.formatStartAt(booking.startAt, tutor.user.timezone),
          senderAvatarUrl: student?.avatar,
        }),
      }),
    ])
  }

  async notifySubscriptionEnrollmentConfirmed(params: {
    enrollmentId: string
    studentId: string
    tutorProfileId: string
  }): Promise<void> {
    const enrollment = await this.prisma.subscriptionEnrollment.findUnique({
      where: { id: params.enrollmentId },
      select: {
        lessonsPerWeek: true,
        grossAmount: true,
        currency: true,
      },
    })
    if (!enrollment) {
      this.logger.warn(`Enrollment not found for notification ${params.enrollmentId}`)
      return
    }

    const [tutor, student] = await Promise.all([
      this.prisma.tutorProfile.findUnique({
        where: { id: params.tutorProfileId },
        select: {
          userId: true,
          firstName: true,
          lastName: true,
          user: { select: { avatar: true, timezone: true, mezonUserId: true } },
        },
      }),
      this.prisma.user.findUnique({
        where: { id: params.studentId },
        select: { username: true, avatar: true, mezonUserId: true },
      }),
    ])

    if (!tutor) {
      this.logger.warn(`Tutor profile not found for enrollment ${params.enrollmentId}`)
      return
    }

    const tutorName =
      `${tutor.firstName ?? ''} ${tutor.lastName ?? ''}`.trim() || 'your tutor'
    const studentName = student?.username ?? 'A student'
    const planLabel = this.subscriptionPlanLabel(enrollment.lessonsPerWeek)
    const currency = (enrollment.currency ?? ECurrency.VND) as SharedCurrency
    const amountFormatted = formatToCurrency(currency, Number(enrollment.grossAmount))

    await Promise.allSettled([
      this.notifyInAppAndMezon({
        userId: params.studentId,
        mezonUserId: student?.mezonUserId,
        dedupeKey: `subscription-enrollment-confirmed:${params.enrollmentId}`,
        notification: {
          title: 'Subscription active',
          content: `Your subscription with ${tutorName} (${planLabel}) is now active.`,
          type: ENotificationType.PAYMENT,
          i18nKey: NOTIFICATION_I18N_KEYS.templates.subscriptionEnrollmentConfirmed,
          i18nParams: { tutorName, planLabel },
          metadata: { enrollmentId: params.enrollmentId },
        },
        mezonMessage: this.mezonMessageService.subscriptionEnrollmentConfirmed({
          tutorName,
          planLabel,
          amountFormatted,
          enrollmentId: params.enrollmentId,
          senderAvatarUrl: tutor.user.avatar,
        }),
      }),
      this.notifyInAppAndMezon({
        userId: tutor.userId,
        mezonUserId: tutor.user.mezonUserId,
        dedupeKey: `subscription-enrollment-paid:${params.enrollmentId}`,
        notification: {
          title: 'New subscription enrollment',
          content: `${studentName} enrolled in your ${planLabel} plan.`,
          type: ENotificationType.PAYMENT,
          i18nKey: NOTIFICATION_I18N_KEYS.templates.subscriptionEnrollmentCreated,
          i18nParams: { studentName, planLabel },
          metadata: {
            titleI18nKey: NOTIFICATION_I18N_KEYS.titles.subscriptionEnrollmentCreated,
            titleI18nParams: {},
            enrollmentId: params.enrollmentId,
            studentId: params.studentId,
            tutorId: params.tutorProfileId,
          },
        },
        mezonMessage: this.mezonMessageService.subscriptionEnrollmentBooked({
          studentName,
          planLabel,
          amountFormatted,
          senderAvatarUrl: student?.avatar,
        }),
      }),
    ])
  }

  async notifyTutorEarningsReleased(params: {
    tutorUserId: string
    amount: bigint
    currency?: ECurrency
    lessonKind: 'trial' | 'subscription'
    bookingId?: string
    enrollmentId?: string
    slotIndex?: number
    dedupeKey: string
  }): Promise<void> {
    const tutor = await this.prisma.user.findUnique({
      where: { id: params.tutorUserId },
      select: { mezonUserId: true },
    })
    if (!tutor) {
      this.logger.warn(`Tutor user not found for earnings notification (${params.dedupeKey})`)
      return
    }

    const currency = (params.currency ?? ECurrency.VND) as SharedCurrency
    const amountFormatted = formatToCurrency(currency, Number(params.amount))
    const title = 'Earnings available'
    const content =
      params.lessonKind === 'trial'
        ? `${amountFormatted} from your trial lesson is now available in your wallet.`
        : `${amountFormatted} from your subscription lesson is now available in your wallet.`

    try {
      await this.createForUser(params.tutorUserId, {
        title,
        content,
        type: ENotificationType.PAYMENT,
        i18nKey: NOTIFICATION_I18N_KEYS.templates.tutorEarningsReleased,
        i18nParams: { amount: amountFormatted, lessonKind: params.lessonKind },
        metadata: {
          titleI18nKey: NOTIFICATION_I18N_KEYS.titles.tutorEarningsReleased,
          titleI18nParams: {},
          lessonKind: params.lessonKind,
          bookingId: params.bookingId,
          enrollmentId: params.enrollmentId,
          slotIndex: params.slotIndex,
        },
        dedupeKey: params.dedupeKey,
      })
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      this.logger.warn(`Failed to create web notification (${params.dedupeKey}): ${detail}`)
    }

    if (!tutor.mezonUserId?.trim()) {
      return
    }
    if (!this.mezonBotService.isConfigured()) {
      this.logger.warn('Mezon bot is not configured; skipping earnings release DM')
      return
    }

    try {
      await this.mezonBotService.sendDMToUser(tutor.mezonUserId, { t: content })
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      this.logger.warn(`Failed to send Mezon DM for earnings release (${params.dedupeKey}): ${detail}`)
    }
  }

  async notifyAdminTutorApplicationSubmitted(params: {
    tutorName: string
    applicationId: string
    senderAvatarUrl?: string | null
  }): Promise<void> {
    await this.sendAdminMezonDm(
      this.mezonMessageService.tutorApplicationSubmitted({
        tutorName: params.tutorName,
        applicationId: params.applicationId,
        senderAvatarUrl: params.senderAvatarUrl,
      }),
      `tutor-application-submitted:${params.applicationId}`
    )
  }

  async notifyAdminWithdrawalRequested(params: {
    withdrawalId: string
    tutorName: string
    amountFormatted: string
    bankName: string
    bankAccountNumber: string
    senderAvatarUrl?: string | null
  }): Promise<void> {
    await this.sendAdminMezonDm(
      this.mezonMessageService.withdrawalRequested({
        tutorName: params.tutorName,
        amountFormatted: params.amountFormatted,
        bankName: params.bankName,
        bankAccountNumber: params.bankAccountNumber,
        senderAvatarUrl: params.senderAvatarUrl,
      }),
      `withdrawal-requested:${params.withdrawalId}`
    )
  }
}
