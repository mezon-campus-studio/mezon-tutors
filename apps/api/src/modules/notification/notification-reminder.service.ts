import { Injectable, Logger } from '@nestjs/common'
import { ENotificationType, ETrialLessonStatus } from '@mezon-tutors/db'
import { Cron, CronExpression } from '@nestjs/schedule'
import { addMinutes, DEFAULT_TIMEZONE, NOTIFICATION_I18N_KEYS } from '@mezon-tutors/shared'
import { PrismaService } from '../../prisma/prisma.service'
import { NotificationService } from './notification.service'
import { MezonBotService } from '../mezon-bot/mezon-bot.service'

@Injectable()
export class NotificationReminderService {
  private readonly logger = new Logger(NotificationReminderService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly mezonBotService: MezonBotService
  ) {}

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
            user: {
              select: {
                mezonUserId: true,
              },
            },
          },
        },
        student: {
          select: {
            mezonUserId: true,
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
              i18nKey: NOTIFICATION_I18N_KEYS.templates.lessonStartingSoon,
              i18nParams: {},
              metadata: {
                titleI18nKey: NOTIFICATION_I18N_KEYS.titles.lessonStartingSoon,
                titleI18nParams: {},
                bookingId: booking.id,
                startAt: booking.startAt.toISOString(),
              },
              dedupeKey: `lesson-starting-soon:${booking.id}`,
            },
            tx
          )
        })

        const dmContent = {
          t: 'Your lesson will start in about 10 minutes.',
        }

        const dmTasks: Promise<void>[] = []
        if (booking.student.mezonUserId) {
          dmTasks.push(this.mezonBotService.sendDMToUser(booking.student.mezonUserId, dmContent))
        }
        if (booking.tutor.user.mezonUserId) {
          dmTasks.push(this.mezonBotService.sendDMToUser(booking.tutor.user.mezonUserId, dmContent))
        }
        await Promise.all(dmTasks)
      } catch (error) {
        this.logger.error(`Failed to create reminder for booking ${booking.id}`, error)
      }
    }
  }
}
