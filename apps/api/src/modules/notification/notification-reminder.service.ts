import { Injectable, Logger } from '@nestjs/common'
import { ENotificationType, ETrialLessonStatus } from '@mezon-tutors/db'
import { Cron, CronExpression } from '@nestjs/schedule'
import { addMinutes, DEFAULT_TIMEZONE, NOTIFICATION_META } from '@mezon-tutors/shared'
import dayjs = require('dayjs')
import utc = require('dayjs/plugin/utc')
import timezone = require('dayjs/plugin/timezone')
import { PrismaService } from '../../prisma/prisma.service'
import { MezonMessageService } from '../../shared/services/mezon-message'
import { MezonBotService } from '../mezon-bot/mezon-bot.service'
import { NotificationService } from './notification.service'

dayjs.extend(utc)
dayjs.extend(timezone)

@Injectable()
export class NotificationReminderService {
  private readonly logger = new Logger(NotificationReminderService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly mezonBotService: MezonBotService,
    private readonly mezonMessageService: MezonMessageService
  ) {}

  private formatStartAt(startAt: Date, timezoneName?: string | null): string {
    const tz = timezoneName?.trim() || 'UTC'
    return dayjs(startAt).tz(tz).format('ddd, D MMM YYYY · HH:mm')
  }

  @Cron(CronExpression.EVERY_MINUTE, { timeZone: DEFAULT_TIMEZONE })
  async notifyUpcomingLessons() {
    const now = new Date();

    const from = addMinutes(now, 9);
    const to = addMinutes(now, 10);


    const upcomingBookings = await this.prisma.trialLessonBooking.findMany({
      where: {
        status: ETrialLessonStatus.CONFIRMED,
        startAt: {
          gte: from,
          lt: to,
        },
      },
      select: {
        id: true,
        startAt: true,
        studentId: true,
        tutor: {
          select: {
            userId: true,
            firstName: true,
            lastName: true,
            mezonClanId: true,
            user: {
              select: {
                mezonUserId: true,
                avatar: true,
                timezone: true,
              },
            },
          },
        },
        student: {
          select: {
            mezonUserId: true,
            username: true,
            avatar: true,
            timezone: true,
          },
        },
      },
    })

    for (const booking of upcomingBookings) {
      try {
        await this.prisma.$transaction(async (tx) => {
          await this.notificationService.createForMany(
            [booking.studentId, booking.tutor.userId],
            {
              title: 'Lesson starting soon',
              content: 'Your lesson will start in about 10 minutes.',
              type: ENotificationType.LESSON_STARTING_SOON,
              i18nKey: NOTIFICATION_META.LESSON_STARTING_SOON.templateKey ?? undefined,
              i18nParams: {},
              metadata: {
                titleI18nKey: NOTIFICATION_META.LESSON_STARTING_SOON.titleKey ?? undefined,
                titleI18nParams: {},
                bookingId: booking.id,
                startAt: booking.startAt.toISOString(),
              },
              dedupeKey: `lesson-starting-soon:${booking.id}`,
            },
            tx
          )
        })

        if (!this.mezonBotService.isConfigured()) {
          continue
        }

        const tutorName =
          `${booking.tutor.firstName ?? ''} ${booking.tutor.lastName ?? ''}`.trim() || 'your tutor'
        const studentName = booking.student.username ?? 'A student'

        let voiceRoom: { id: string; name: string } | undefined
        if (booking.tutor.mezonClanId) {
          try {
            voiceRoom = await this.mezonBotService.pickVoiceRoomForLesson(booking.tutor.mezonClanId)
          } catch (error) {
            this.logger.warn(
              `Could not fetch voice room for booking ${booking.id}`,
              error instanceof Error ? error.message : error
            )
          }
        }

        const dmTasks: Promise<void>[] = []
        if (booking.student.mezonUserId) {
          dmTasks.push(
            this.mezonBotService.sendDMToUser(
              booking.student.mezonUserId,
              this.mezonMessageService.lessonStartingSoon({
                counterpartyName: tutorName,
                startAtLabel: this.formatStartAt(booking.startAt, booking.student.timezone),
                role: 'student',
                lessonKind: 'trial',
                senderAvatarUrl: booking.tutor.user.avatar,
                voiceRoom,
              })
            )
          )
        }
        if (booking.tutor.user.mezonUserId) {
          dmTasks.push(
            this.mezonBotService.sendDMToUser(
              booking.tutor.user.mezonUserId,
              this.mezonMessageService.lessonStartingSoon({
                counterpartyName: studentName,
                startAtLabel: this.formatStartAt(booking.startAt, booking.tutor.user.timezone),
                role: 'tutor',
                lessonKind: 'trial',
                senderAvatarUrl: booking.student.avatar,
                voiceRoom,
              })
            )
          )
        }
        await Promise.all(dmTasks)
      } catch (error) {
        this.logger.error(`Failed to create reminder for booking ${booking.id}`, error)
      }
    }
  }
}
