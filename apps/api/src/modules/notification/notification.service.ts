import { Injectable, NotFoundException } from '@nestjs/common'
import { Prisma, type ENotificationType } from '@mezon-tutors/db'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateNotificationDto } from './dto/create-notification.dto'
import { GetMyNotificationsDto } from './dto/get-my-notifications.dto'

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
  constructor(private readonly prisma: PrismaService) {}

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
}
