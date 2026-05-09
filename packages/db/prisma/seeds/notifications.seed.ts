import { ENotificationType, Prisma, PrismaClient } from '@mezon-tutors/db';
import { NOTIFICATION_I18N_KEYS } from '@mezon-tutors/shared';

const SEED_NOTI_DEDUPE_PREFIX = 'seed-noti-';

const EN_FALLBACK = {
  bookingTitle: 'New trial lesson request',
  bookingBody:
    'Alex Nguyen has booked a trial lesson. Please review and confirm.',
  paymentTitle: 'Payment successful',
  paymentBody: 'Your payment for booking TRIAL-SEED-001 was successful.',
  systemTitle: 'System announcement',
  systemBody:
    "We've improved the notification experience. Check your inbox for updates.",
  lessonTitle: 'Lesson starting soon',
  lessonBody: 'Your lesson will start in about 15 minutes.',
} as const;

type SeedNotiDef = {
  dedupeKey: string;
  titleFallback: string;
  contentFallback: string;
  type: ENotificationType;
  bodyI18nKey: string;
  bodyI18nParams: Record<string, string>;
  metadata: Record<string, unknown>;
  markFirstRecipientRead?: boolean;
};

export async function seedNotifications(prisma: PrismaClient): Promise<void> {
  console.log('Seeding sample notifications...');

  await prisma.notification.deleteMany({
    where: { dedupeKey: { startsWith: SEED_NOTI_DEDUPE_PREFIX } },
  });

  const users = await prisma.user.findMany({
    orderBy: { id: 'asc' },
    select: { id: true },
  });

  if (users.length === 0) {
    console.warn('Không có user trong DB; bỏ qua seed notification.');
    return;
  }

  const defs: SeedNotiDef[] = [
    {
      dedupeKey: `${SEED_NOTI_DEDUPE_PREFIX}booking-001`,
      titleFallback: EN_FALLBACK.bookingTitle,
      contentFallback: EN_FALLBACK.bookingBody,
      type: ENotificationType.BOOKING,
      bodyI18nKey: NOTIFICATION_I18N_KEYS.templates.bookingCreated,
      bodyI18nParams: { studentName: 'Alex Nguyen' },
      metadata: {
        titleI18nKey: NOTIFICATION_I18N_KEYS.titles.bookingCreated,
        titleI18nParams: {},
        seed: true,
      },
    },
    {
      dedupeKey: `${SEED_NOTI_DEDUPE_PREFIX}payment-001`,
      titleFallback: EN_FALLBACK.paymentTitle,
      contentFallback: EN_FALLBACK.paymentBody,
      type: ENotificationType.PAYMENT,
      bodyI18nKey: NOTIFICATION_I18N_KEYS.templates.paymentSucceeded,
      bodyI18nParams: { bookingCode: 'TRIAL-SEED-001' },
      metadata: {
        titleI18nKey: NOTIFICATION_I18N_KEYS.titles.paymentSucceeded,
        titleI18nParams: {},
        seed: true,
      },
      markFirstRecipientRead: true,
    },
    {
      dedupeKey: `${SEED_NOTI_DEDUPE_PREFIX}system-001`,
      titleFallback: EN_FALLBACK.systemTitle,
      contentFallback: EN_FALLBACK.systemBody,
      type: ENotificationType.SYSTEM,
      bodyI18nKey: NOTIFICATION_I18N_KEYS.templates.systemAnnouncement,
      bodyI18nParams: {
        message: EN_FALLBACK.systemBody,
      },
      metadata: {
        titleI18nKey: NOTIFICATION_I18N_KEYS.titles.systemAnnouncement,
        titleI18nParams: {},
        seed: true,
      },
    },
    {
      dedupeKey: `${SEED_NOTI_DEDUPE_PREFIX}lesson-soon-001`,
      titleFallback: EN_FALLBACK.lessonTitle,
      contentFallback: EN_FALLBACK.lessonBody,
      type: ENotificationType.LESSON_STARTING_SOON,
      bodyI18nKey: NOTIFICATION_I18N_KEYS.templates.lessonStartingSoon,
      bodyI18nParams: {},
      metadata: {
        titleI18nKey: NOTIFICATION_I18N_KEYS.titles.lessonStartingSoon,
        titleI18nParams: {},
        seed: true,
      },
    },
  ];

  const firstUserId = users[0]?.id;

  for (const def of defs) {
    const notification = await prisma.notification.create({
      data: {
        dedupeKey: def.dedupeKey,
        title: def.titleFallback,
        content: def.contentFallback,
        type: def.type,
        i18nKey: def.bodyI18nKey,
        i18nParams: def.bodyI18nParams as Prisma.InputJsonValue,
        metadata: def.metadata as Prisma.InputJsonValue,
      },
    });

    const rows = users.map((u) => {
      const isRead = Boolean(def.markFirstRecipientRead && firstUserId && u.id === firstUserId);
      return {
        notificationId: notification.id,
        userId: u.id,
        isRead,
        readAt: isRead ? new Date() : null,
      };
    });

    await prisma.notificationRecipient.createMany({
      data: rows,
      skipDuplicates: true,
    });
  }

  console.log(
    `Đã tạo ${defs.length} notification mẫu (i18n title + body), mỗi cái gửi đến tất cả ${users.length} user.`
  );
}
