import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  ETrialLessonStatus,
  EPaymentStatus,
  ESubscriptionEnrollmentStatus,
  Prisma,
  Role,
} from '@mezon-tutors/db';
import type { GoogleCalendarSyncResult } from '@mezon-tutors/shared';
import {
  DEFAULT_TIMEZONE,
  ESubscriptionLessonSlotStatus,
  ROUTES,
  isLessonFinishedForComplaint,
  normalizeSubscriptionSlotStatus,
  subscriptionConcreteOccurrencesSorted,
  subscriptionSlotsUseConcreteDates,
  type SubscriptionWeeklySlotDto,
} from '@mezon-tutors/shared';
import dayjs = require('dayjs');
import utc = require('dayjs/plugin/utc');
import timezone = require('dayjs/plugin/timezone');
import { PrismaService } from '../../prisma/prisma.service';
import { AppConfigService } from '../../shared/services/app-config.service';
import { GoogleCalendarService } from './google-calendar.service';

dayjs.extend(utc);
dayjs.extend(timezone);

const GOOGLE_CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';
const MEZONLY_GCAL_APP_KEY = 'mezonlyApp';
const MEZONLY_GCAL_APP_VALUE = 'mezonly-tutors';
const MEZONLY_GCAL_LESSON_KEY = 'mezonlyKey';
const SYNC_LOOKAHEAD_DAYS = 180;
const SYNC_CONCURRENCY = 6;
const GCAL_MAX_RETRIES = 5;
const GCAL_INITIAL_BACKOFF_MS = 1000;
const GCAL_COLOR_TRIAL = '5';
const GCAL_COLOR_PLAN = '3';

type SyncableLesson = {
  key: string;
  title: string;
  description: string;
  startAt: Date;
  endAt: Date;
  colorId: string;
};

type GoogleCalendarEventPayload = {
  id?: string;
  summary: string;
  description?: string;
  colorId?: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  extendedProperties?: {
    private?: Record<string, string>;
  };
};

type GoogleCalendarEventsListResponse = {
  items?: Array<{
    id?: string;
    start?: { dateTime?: string; date?: string };
    extendedProperties?: { private?: Record<string, string> };
  }>;
  nextPageToken?: string;
};

@Injectable()
export class GoogleCalendarSyncService {
  private readonly logger = new Logger(GoogleCalendarSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly googleCalendarService: GoogleCalendarService,
    private readonly appConfig: AppConfigService,
  ) {}

  dispatchTrialBookingSync(bookingId: string): void {
    this.dispatchRealtimeTask(
      () => this.syncTrialBookingRealtime(bookingId),
      `trial booking ${bookingId}`,
    );
  }

  dispatchSubscriptionEnrollmentSync(enrollmentId: string): void {
    this.dispatchRealtimeTask(
      () => this.syncSubscriptionEnrollmentRealtime(enrollmentId),
      `subscription enrollment ${enrollmentId}`,
    );
  }

  dispatchSubscriptionSlotSync(params: {
    enrollmentId: string;
    slotIndex: number;
    previousOccurrenceStartAt?: Date;
  }): void {
    this.dispatchRealtimeTask(
      () => this.syncSubscriptionSlotRealtime(params),
      `subscription slot ${params.enrollmentId}:${params.slotIndex}`,
    );
  }

  private dispatchRealtimeTask(task: () => Promise<void>, label: string): void {
    void task().catch((error) => {
      this.logger.warn(`Google Calendar realtime sync failed for ${label}: ${String(error)}`);
    });
  }

  private uniqueParticipantUserIds(userIds: Array<string | null | undefined>): string[] {
    return [...new Set(userIds.filter((userId): userId is string => Boolean(userId?.trim())))];
  }

  private async syncForConnectedParticipants(
    participantUserIds: string[],
    worker: (userId: string) => Promise<void>,
    label: string,
  ): Promise<void> {
    const userIds = this.uniqueParticipantUserIds(participantUserIds);
    if (userIds.length === 0) {
      return;
    }

    const results = await Promise.allSettled(
      userIds.map(async (userId) => {
        const connection = await this.prisma.googleCalendarConnection.findUnique({
          where: { userId },
          select: { userId: true },
        });
        if (!connection) {
          return;
        }
        await worker(userId);
      }),
    );

    for (const [index, result] of results.entries()) {
      if (result.status === 'rejected') {
        this.logger.warn(
          `Google Calendar sync failed for ${label} (user ${userIds[index]}): ${String(result.reason)}`,
        );
      }
    }
  }

  private async syncTrialBookingRealtime(bookingId: string): Promise<void> {
    const booking = await this.prisma.trialLessonBooking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        studentId: true,
        status: true,
        paymentStatus: true,
        startAt: true,
        durationMinutes: true,
        student: { select: { id: true, username: true } },
        tutor: {
          select: {
            userId: true,
            user: { select: { username: true } },
          },
        },
      },
    });
    if (!booking) {
      return;
    }

    const participantUserIds = this.uniqueParticipantUserIds([
      booking.studentId,
      booking.tutor.userId,
    ]);
    const lessonKey = this.trialLessonKey(bookingId);

    if (!this.isTrialBookingSyncable(booking)) {
      await this.syncForConnectedParticipants(participantUserIds, async (userId) => {
        await this.deleteLessonKeyForUser(userId, lessonKey);
      }, `trial booking ${bookingId} delete`);
      return;
    }

    await this.syncForConnectedParticipants(
      participantUserIds,
      async (userId) => {
        const lesson = this.buildTrialLessonForUser(booking, userId);
        if (!lesson) {
          await this.deleteLessonKeyForUser(userId, lessonKey);
          return;
        }
        await this.upsertLessonForUser(userId, lesson);
      },
      `trial booking ${bookingId}`,
    );
  }

  private async syncSubscriptionEnrollmentRealtime(enrollmentId: string): Promise<void> {
    const enrollment = await this.prisma.subscriptionEnrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        student: { select: { id: true, username: true } },
        tutor: {
          select: {
            userId: true,
            user: { select: { username: true } },
          },
        },
      },
    });
    if (!enrollment) {
      return;
    }

    const participantUserIds = this.uniqueParticipantUserIds([
      enrollment.studentId,
      enrollment.tutor.userId,
    ]);
    const keyPrefix = this.subscriptionEnrollmentKeyPrefix(enrollmentId);

    if (!this.isSubscriptionEnrollmentSyncable(enrollment)) {
      await this.syncForConnectedParticipants(
        participantUserIds,
        async (userId) => {
          const existingByKey = await this.listExistingMezonlyEventsForUser(userId);
          const staleEntries = [...existingByKey.entries()].filter(([lessonKey]) =>
            lessonKey.startsWith(keyPrefix),
          );
          await Promise.all(
            staleEntries.map(([, eventId]) =>
              this.deleteGoogleEventForUser(userId, eventId).catch((error) => {
                this.logger.warn(
                  `Failed to remove prefixed Google event for user ${userId}: ${String(error)}`,
                );
              }),
            ),
          );
        },
        `subscription enrollment ${enrollmentId} delete`,
      );
      return;
    }

    const now = new Date();
    await this.syncForConnectedParticipants(
      participantUserIds,
      async (userId) => {
        await this.syncSubscriptionEnrollmentLessonsForUser({
          enrollment,
          userId,
          now,
        });
      },
      `subscription enrollment ${enrollmentId}`,
    );
  }

  private async syncSubscriptionSlotRealtime(params: {
    enrollmentId: string;
    slotIndex: number;
    previousOccurrenceStartAt?: Date;
  }): Promise<void> {
    const enrollment = await this.prisma.subscriptionEnrollment.findUnique({
      where: { id: params.enrollmentId },
      include: {
        student: { select: { id: true, username: true } },
        tutor: {
          select: {
            userId: true,
            user: { select: { username: true } },
          },
        },
      },
    });
    if (!enrollment) {
      return;
    }

    const participantUserIds = this.uniqueParticipantUserIds([
      enrollment.studentId,
      enrollment.tutor.userId,
    ]);

    if (params.previousOccurrenceStartAt) {
      const oldKey = this.subscriptionLessonKey(
        params.enrollmentId,
        params.slotIndex,
        params.previousOccurrenceStartAt,
      );
      await this.syncForConnectedParticipants(
        participantUserIds,
        async (userId) => {
          await this.deleteLessonKeyForUser(userId, oldKey);
        },
        `subscription slot ${params.enrollmentId}:${params.slotIndex} delete-old`,
      );
    }

    if (!this.isSubscriptionEnrollmentSyncable(enrollment)) {
      return;
    }

    const now = new Date();
    const slots = this.parseEnrollmentWeeklySlots(enrollment.weeklySlots);
    const occurrences = subscriptionConcreteOccurrencesSorted(slots, DEFAULT_TIMEZONE);
    const currentOccurrence = occurrences.find(
      (occurrence) => occurrence.slotIndex === params.slotIndex,
    );

    await this.syncForConnectedParticipants(
      participantUserIds,
      async (userId) => {
        const lessons = this.buildSubscriptionLessonsForUser({
          enrollment,
          userId,
          now,
          slotIndex: params.slotIndex,
        });

        if (lessons.length > 0) {
          await Promise.all(lessons.map((lesson) => this.upsertLessonForUser(userId, lesson)));
          return;
        }

        if (currentOccurrence) {
          const currentKey = this.subscriptionLessonKey(
            params.enrollmentId,
            params.slotIndex,
            currentOccurrence.startAt,
          );
          await this.deleteLessonKeyForUser(userId, currentKey);
        }
      },
      `subscription slot ${params.enrollmentId}:${params.slotIndex}`,
    );
  }

  private async syncSubscriptionEnrollmentLessonsForUser(input: {
    enrollment: {
      id: string;
      studentId: string;
      weeklySlots: Prisma.JsonValue;
      student: { username: string };
      tutor: { userId: string; user: { username: string } };
    };
    userId: string;
    now: Date;
  }): Promise<void> {
    const lessons = this.buildSubscriptionLessonsForUser({
      enrollment: input.enrollment,
      userId: input.userId,
      now: input.now,
    });
    const keyPrefix = this.subscriptionEnrollmentKeyPrefix(input.enrollment.id);
    const activeKeys = new Set(lessons.map((lesson) => lesson.key));

    await Promise.all(lessons.map((lesson) => this.upsertLessonForUser(input.userId, lesson)));

    const existingByKey = await this.listExistingMezonlyEventsForUser(input.userId);
    const staleEntries = [...existingByKey.entries()].filter(
      ([lessonKey]) => lessonKey.startsWith(keyPrefix) && !activeKeys.has(lessonKey),
    );
    await Promise.all(
      staleEntries.map(([, eventId]) =>
        this.deleteGoogleEventForUser(input.userId, eventId).catch((error) => {
          this.logger.warn(
            `Failed to remove stale subscription Google event for user ${input.userId}: ${String(error)}`,
          );
        }),
      ),
    );
  }

  private isTrialBookingSyncable(booking: {
    status: ETrialLessonStatus;
    paymentStatus: EPaymentStatus;
    startAt: Date;
    durationMinutes: number;
  }): boolean {
    if (booking.status !== ETrialLessonStatus.CONFIRMED) {
      return false;
    }
    if (booking.paymentStatus !== EPaymentStatus.SUCCEEDED) {
      return false;
    }
    if (booking.startAt < new Date()) {
      return false;
    }
    if (isLessonFinishedForComplaint(booking.startAt, booking.durationMinutes)) {
      return false;
    }
    return true;
  }

  private isSubscriptionEnrollmentSyncable(enrollment: {
    status: ESubscriptionEnrollmentStatus;
    paymentStatus: EPaymentStatus;
  }): boolean {
    return (
      enrollment.status === ESubscriptionEnrollmentStatus.ACTIVE &&
      enrollment.paymentStatus === EPaymentStatus.SUCCEEDED
    );
  }

  private buildTrialLessonForUser(
    booking: {
      id: string;
      studentId: string;
      status: ETrialLessonStatus;
      paymentStatus: EPaymentStatus;
      startAt: Date;
      durationMinutes: number;
      student: { username: string };
      tutor: { userId: string; user: { username: string } };
    },
    userId: string,
  ): SyncableLesson | null {
    if (!this.isTrialBookingSyncable(booking)) {
      return null;
    }

    const frontendBase = this.appConfig.frontendUrl.replace(/\/+$/, '');
    const endAt = dayjs(booking.startAt).add(booking.durationMinutes, 'minute').toDate();
    const isStudent = userId === booking.studentId;

    return {
      key: this.trialLessonKey(booking.id),
      title: `Mezonly Trial: ${isStudent ? booking.tutor.user.username : booking.student.username}`,
      description: this.buildLessonDescription({
        lessonType: 'Trial lesson',
        counterpart: isStudent ? booking.tutor.user.username : booking.student.username,
        durationMinutes: booking.durationMinutes,
        dashboardUrl: `${frontendBase}${isStudent ? ROUTES.DASHBOARD.MY_LESSONS : ROUTES.DASHBOARD.MY_SCHEDULE}`,
      }),
      startAt: booking.startAt,
      endAt,
      colorId: GCAL_COLOR_TRIAL,
    };
  }

  private buildSubscriptionLessonsForUser(input: {
    enrollment: {
      id: string;
      studentId: string;
      weeklySlots: Prisma.JsonValue;
      student: { username: string };
      tutor: { userId: string; user: { username: string } };
    };
    userId: string;
    now: Date;
    slotIndex?: number;
  }): SyncableLesson[] {
    const isStudent = input.userId === input.enrollment.studentId;
    const frontendBase = this.appConfig.frontendUrl.replace(/\/+$/, '');

    return this.subscriptionLessonsFromEnrollment({
      enrollment: input.enrollment,
      counterpartName: isStudent
        ? input.enrollment.tutor.user.username
        : input.enrollment.student.username,
      lessonTypeLabel: isStudent ? 'Subscription lesson' : 'Plan lesson',
      dashboardUrl: `${frontendBase}${isStudent ? ROUTES.DASHBOARD.MY_LESSONS : ROUTES.DASHBOARD.MY_SCHEDULE}`,
      now: input.now,
      slotIndex: input.slotIndex,
    });
  }

  private trialLessonKey(bookingId: string): string {
    return `trial:${bookingId}`;
  }

  private subscriptionLessonKey(
    enrollmentId: string,
    slotIndex: number,
    occurrenceStartAt: Date,
  ): string {
    return `subscription:${enrollmentId}:${slotIndex}:${occurrenceStartAt.toISOString()}`;
  }

  private subscriptionEnrollmentKeyPrefix(enrollmentId: string): string {
    return `subscription:${enrollmentId}:`;
  }

  private async upsertLessonForUser(userId: string, lesson: SyncableLesson): Promise<void> {
    const context = await this.getConnectedUserContext(userId);
    if (!context) {
      return;
    }

    const existingByKey = await this.listExistingMezonlyEvents(
      context.accessToken,
      context.calendarId,
      new Date(),
      dayjs().add(SYNC_LOOKAHEAD_DAYS, 'day').toDate(),
    );
    const payload = this.buildGoogleEventPayload(lesson, context.timezoneName);
    const existingEventId = existingByKey.get(lesson.key);

    if (existingEventId) {
      await this.patchGoogleEvent(context.accessToken, context.calendarId, existingEventId, payload);
      return;
    }

    await this.createGoogleEvent(context.accessToken, context.calendarId, payload);
  }

  private async deleteLessonKeyForUser(userId: string, lessonKey: string): Promise<void> {
    const existingByKey = await this.listExistingMezonlyEventsForUser(userId);
    const eventId = existingByKey.get(lessonKey);
    if (!eventId) {
      return;
    }
    await this.deleteGoogleEventForUser(userId, eventId);
  }

  private async getConnectedUserContext(
    userId: string,
  ): Promise<{ accessToken: string; calendarId: string; timezoneName: string } | null> {
    const connection = await this.prisma.googleCalendarConnection.findUnique({
      where: { userId },
    });
    if (!connection) {
      return null;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    });

    return {
      accessToken: await this.googleCalendarService.getValidAccessToken(userId),
      calendarId: connection.calendarId?.trim() || 'primary',
      timezoneName: user?.timezone?.trim() || DEFAULT_TIMEZONE,
    };
  }

  private async listExistingMezonlyEventsForUser(userId: string): Promise<Map<string, string>> {
    const context = await this.getConnectedUserContext(userId);
    if (!context) {
      return new Map();
    }

    return this.listExistingMezonlyEvents(
      context.accessToken,
      context.calendarId,
      new Date(),
      dayjs().add(SYNC_LOOKAHEAD_DAYS, 'day').toDate(),
    );
  }

  private async deleteGoogleEventForUser(userId: string, eventId: string): Promise<void> {
    const context = await this.getConnectedUserContext(userId);
    if (!context) {
      return;
    }

    await this.deleteGoogleEvent(context.accessToken, context.calendarId, eventId);
  }

  async syncLessons(userId: string): Promise<GoogleCalendarSyncResult> {
    const connection = await this.prisma.googleCalendarConnection.findUnique({
      where: { userId },
    });
    if (!connection) {
      throw new NotFoundException('Google Calendar is not connected.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        timezone: true,
        username: true,
        tutorProfile: { select: { id: true } },
      },
    });
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const timezoneName = user.timezone?.trim() || DEFAULT_TIMEZONE;
    const accessToken = await this.googleCalendarService.getValidAccessToken(userId);
    const calendarId = connection.calendarId?.trim() || 'primary';
    const lessons = await this.collectUpcomingLessons(user, timezoneName);
    const now = new Date();
    const timeMax = dayjs(now).add(SYNC_LOOKAHEAD_DAYS, 'day').toDate();

    const existingByKey = await this.listExistingMezonlyEvents(
      accessToken,
      calendarId,
      now,
      timeMax,
    );

    const activeKeys = new Set(lessons.map((lesson) => lesson.key));

    const upsertResults = await this.runWithConcurrency(
      lessons,
      SYNC_CONCURRENCY,
      async (lesson) => {
        const payload = this.buildGoogleEventPayload(lesson, timezoneName);
        const existingEventId = existingByKey.get(lesson.key);

        if (existingEventId) {
          await this.patchGoogleEvent(accessToken, calendarId, existingEventId, payload);
          return 'updated' as const;
        }

        await this.createGoogleEvent(accessToken, calendarId, payload);
        return 'created' as const;
      },
    );

    const created = upsertResults.filter((result) => result === 'created').length;
    const updated = upsertResults.filter((result) => result === 'updated').length;

    const staleEntries = [...existingByKey.entries()].filter(
      ([lessonKey]) => !activeKeys.has(lessonKey),
    );

    const removeResults = await this.runWithConcurrency(
      staleEntries,
      SYNC_CONCURRENCY,
      async ([, eventId]) => {
        try {
          await this.deleteGoogleEvent(accessToken, calendarId, eventId);
          return true;
        } catch (error) {
          this.logger.warn(`Failed to remove stale Google event ${eventId}: ${String(error)}`);
          return false;
        }
      },
    );

    const removed = removeResults.filter(Boolean).length;

    const lastSyncedAt = new Date();
    await this.prisma.googleCalendarConnection.update({
      where: { userId },
      data: { lastSyncedAt },
    });

    return {
      synced: lessons.length,
      created,
      updated,
      removed,
      lastSyncedAt: lastSyncedAt.toISOString(),
    };
  }

  private async collectUpcomingLessons(
    user: {
      id: string;
      role: Role;
      tutorProfile: { id: string } | null;
    },
    timezoneName: string,
  ): Promise<SyncableLesson[]> {
    const now = new Date();
    const frontendBase = this.appConfig.frontendUrl.replace(/\/+$/, '');
    const lessons: SyncableLesson[] = [];
    const tutorProfileId = user.tutorProfile?.id;

    const [trialAsStudent, trialAsTutor, subscriptionAsStudent, subscriptionAsTutor] =
      await Promise.all([
        this.prisma.trialLessonBooking.findMany({
          where: {
            studentId: user.id,
            status: ETrialLessonStatus.CONFIRMED,
            paymentStatus: EPaymentStatus.SUCCEEDED,
            startAt: { gte: now },
          },
          include: {
            tutor: { include: { user: { select: { username: true } } } },
          },
          orderBy: { startAt: 'asc' },
        }),
        tutorProfileId
          ? this.prisma.trialLessonBooking.findMany({
              where: {
                tutorId: tutorProfileId,
                status: ETrialLessonStatus.CONFIRMED,
                paymentStatus: EPaymentStatus.SUCCEEDED,
                startAt: { gte: now },
              },
              include: {
                student: { select: { username: true } },
              },
              orderBy: { startAt: 'asc' },
            })
          : Promise.resolve([]),
        this.prisma.subscriptionEnrollment.findMany({
          where: {
            studentId: user.id,
            status: ESubscriptionEnrollmentStatus.ACTIVE,
            paymentStatus: EPaymentStatus.SUCCEEDED,
          },
          include: {
            tutor: { include: { user: { select: { username: true } } } },
          },
        }),
        tutorProfileId
          ? this.prisma.subscriptionEnrollment.findMany({
              where: {
                tutorId: tutorProfileId,
                status: ESubscriptionEnrollmentStatus.ACTIVE,
                paymentStatus: EPaymentStatus.SUCCEEDED,
              },
              include: {
                student: { select: { username: true } },
              },
            })
          : Promise.resolve([]),
      ]);

    for (const booking of trialAsStudent) {
      const endAt = dayjs(booking.startAt).add(booking.durationMinutes, 'minute').toDate();
      if (isLessonFinishedForComplaint(booking.startAt, booking.durationMinutes)) {
        continue;
      }
      lessons.push({
        key: `trial:${booking.id}`,
        title: `Mezonly Trial: ${booking.tutor.user.username}`,
        description: this.buildLessonDescription({
          lessonType: 'Trial lesson',
          counterpart: booking.tutor.user.username,
          durationMinutes: booking.durationMinutes,
          dashboardUrl: `${frontendBase}${ROUTES.DASHBOARD.MY_LESSONS}`,
        }),
        startAt: booking.startAt,
        endAt,
        colorId: GCAL_COLOR_TRIAL,
      });
    }

    for (const booking of trialAsTutor) {
      const endAt = dayjs(booking.startAt).add(booking.durationMinutes, 'minute').toDate();
      if (isLessonFinishedForComplaint(booking.startAt, booking.durationMinutes)) {
        continue;
      }
      lessons.push({
        key: `trial:${booking.id}`,
        title: `Mezonly Trial: ${booking.student.username}`,
        description: this.buildLessonDescription({
          lessonType: 'Trial lesson',
          counterpart: booking.student.username,
          durationMinutes: booking.durationMinutes,
          dashboardUrl: `${frontendBase}${ROUTES.DASHBOARD.MY_SCHEDULE}`,
        }),
        startAt: booking.startAt,
        endAt,
        colorId: GCAL_COLOR_TRIAL,
      });
    }

    for (const enrollment of subscriptionAsStudent) {
      lessons.push(
        ...this.subscriptionLessonsFromEnrollment({
          enrollment,
          counterpartName: enrollment.tutor.user.username,
          lessonTypeLabel: 'Subscription lesson',
          dashboardUrl: `${frontendBase}${ROUTES.DASHBOARD.MY_LESSONS}`,
          now,
        }),
      );
    }

    if (user.tutorProfile) {
      const subscriptionAsTutor = await this.prisma.subscriptionEnrollment.findMany({
        where: {
          tutorId: user.tutorProfile.id,
          status: ESubscriptionEnrollmentStatus.ACTIVE,
          paymentStatus: EPaymentStatus.SUCCEEDED,
        },
        include: {
          student: { select: { username: true } },
        },
      });

      for (const enrollment of subscriptionAsTutor) {
        lessons.push(
          ...this.subscriptionLessonsFromEnrollment({
            enrollment,
            counterpartName: enrollment.student.username,
            lessonTypeLabel: 'Plan lesson',
            dashboardUrl: `${frontendBase}${ROUTES.DASHBOARD.MY_SCHEDULE}`,
            now,
          }),
        );
      }
    }

    const deduped = new Map<string, SyncableLesson>();
    for (const lesson of lessons) {
      deduped.set(lesson.key, lesson);
    }

    return [...deduped.values()].sort(
      (a, b) => a.startAt.getTime() - b.startAt.getTime() || a.key.localeCompare(b.key),
    );
  }

  private subscriptionLessonsFromEnrollment(input: {
    enrollment: {
      id: string;
      weeklySlots: Prisma.JsonValue;
    };
    counterpartName: string;
    lessonTypeLabel: string;
    dashboardUrl: string;
    now: Date;
    slotIndex?: number;
  }): SyncableLesson[] {
    const slots = this.parseEnrollmentWeeklySlots(input.enrollment.weeklySlots);
    if (!subscriptionSlotsUseConcreteDates(slots)) {
      return [];
    }

    const lessons: SyncableLesson[] = [];
    const occurrences = subscriptionConcreteOccurrencesSorted(slots, DEFAULT_TIMEZONE);

    for (const occurrence of occurrences) {
      if (occurrence.startAt < input.now) {
        continue;
      }

      const slot = slots[occurrence.slotIndex];
      const slotStatus = normalizeSubscriptionSlotStatus(slot?.status);
      if (
        slotStatus === ESubscriptionLessonSlotStatus.CANCELLED ||
        slotStatus === ESubscriptionLessonSlotStatus.REFUNDED
      ) {
        continue;
      }

      const durationMinutes =
        slot?.durationMinutes ??
        Math.max(1, Math.round((occurrence.endAt.getTime() - occurrence.startAt.getTime()) / 60_000));

      if (isLessonFinishedForComplaint(occurrence.startAt, durationMinutes)) {
        continue;
      }

      const startKey = occurrence.startAt.toISOString();
      lessons.push({
        key: `subscription:${input.enrollment.id}:${occurrence.slotIndex}:${startKey}`,
        title: `Mezonly ${input.lessonTypeLabel}: ${input.counterpartName}`,
        description: this.buildLessonDescription({
          lessonType: input.lessonTypeLabel,
          counterpart: input.counterpartName,
          durationMinutes,
          dashboardUrl: input.dashboardUrl,
        }),
        startAt: occurrence.startAt,
        endAt: occurrence.endAt,
        colorId: GCAL_COLOR_PLAN,
      });
    }

    return lessons;
  }

  private parseEnrollmentWeeklySlots(value: Prisma.JsonValue): SubscriptionWeeklySlotDto[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value as unknown as SubscriptionWeeklySlotDto[];
  }

  private buildLessonDescription(input: {
    lessonType: string;
    counterpart: string;
    durationMinutes: number;
    dashboardUrl: string;
  }): string {
    return [
      `Lesson type: ${input.lessonType}`,
      `With: ${input.counterpart}`,
      `Duration: ${input.durationMinutes} minutes`,
      `Open in Mezonly: ${input.dashboardUrl}`,
    ].join('\n');
  }

  private buildGoogleEventPayload(
    lesson: SyncableLesson,
    timezoneName: string,
  ): GoogleCalendarEventPayload {
    return {
      summary: lesson.title,
      description: lesson.description,
      colorId: lesson.colorId,
      start: {
        dateTime: dayjs(lesson.startAt).tz(timezoneName).format(),
        timeZone: timezoneName,
      },
      end: {
        dateTime: dayjs(lesson.endAt).tz(timezoneName).format(),
        timeZone: timezoneName,
      },
      extendedProperties: {
        private: {
          [MEZONLY_GCAL_APP_KEY]: MEZONLY_GCAL_APP_VALUE,
          [MEZONLY_GCAL_LESSON_KEY]: lesson.key,
        },
      },
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  private isRateLimitError(status: number, errorBody: string): boolean {
    if (status === 429) {
      return true;
    }
    return (
      status === 403 &&
      (errorBody.includes('rateLimitExceeded') || errorBody.includes('usageLimits'))
    );
  }

  private getRetryDelayMs(response: Response, attempt: number): number {
    const retryAfter = response.headers.get('Retry-After');
    if (retryAfter) {
      const seconds = Number.parseInt(retryAfter, 10);
      if (!Number.isNaN(seconds)) {
        return seconds * 1000;
      }
    }
    return GCAL_INITIAL_BACKOFF_MS * 2 ** attempt;
  }

  private async googleCalendarFetch(
    url: string,
    init: RequestInit,
    action: string,
  ): Promise<Response> {
    let lastErrorBody = '';

    for (let attempt = 0; attempt <= GCAL_MAX_RETRIES; attempt += 1) {
      const response = await fetch(url, init);
      if (response.ok) {
        return response;
      }

      lastErrorBody = await response.text();
      const shouldRetry =
        this.isRateLimitError(response.status, lastErrorBody) && attempt < GCAL_MAX_RETRIES;

      if (!shouldRetry) {
        throw new BadRequestException(`Failed to ${action}: ${lastErrorBody}`);
      }

      const delayMs = this.getRetryDelayMs(response, attempt);
      this.logger.warn(
        `Google Calendar rate limit while ${action}, retry ${attempt + 1}/${GCAL_MAX_RETRIES} in ${delayMs}ms`,
      );
      await this.sleep(delayMs);
    }

    throw new BadRequestException(`Failed to ${action}: ${lastErrorBody}`);
  }

  private async runWithConcurrency<T, R>(
    items: readonly T[],
    concurrency: number,
    worker: (item: T) => Promise<R>,
  ): Promise<R[]> {
    if (items.length === 0) {
      return [];
    }

    const results: R[] = new Array(items.length);
    let nextIndex = 0;

    const runWorker = async () => {
      while (true) {
        const index = nextIndex;
        nextIndex += 1;
        if (index >= items.length) {
          return;
        }
        results[index] = await worker(items[index]);
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker()),
    );

    return results;
  }

  private async listExistingMezonlyEvents(
    accessToken: string,
    calendarId: string,
    timeMin: Date,
    timeMax: Date,
  ): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    let pageToken: string | undefined;

    do {
      const params = new URLSearchParams({
        privateExtendedProperty: `${MEZONLY_GCAL_APP_KEY}=${MEZONLY_GCAL_APP_VALUE}`,
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: 'true',
        maxResults: '2500',
      });
      if (pageToken) {
        params.set('pageToken', pageToken);
      }

      const response = await this.googleCalendarFetch(
        `${GOOGLE_CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
        'list Google Calendar events',
      );

      const body = (await response.json()) as GoogleCalendarEventsListResponse;
      for (const item of body.items ?? []) {
        const lessonKey = item.extendedProperties?.private?.[MEZONLY_GCAL_LESSON_KEY];
        if (lessonKey && item.id) {
          map.set(lessonKey, item.id);
        }
      }
      pageToken = body.nextPageToken;
    } while (pageToken);

    return map;
  }

  private async createGoogleEvent(
    accessToken: string,
    calendarId: string,
    payload: GoogleCalendarEventPayload,
  ) {
    await this.googleCalendarFetch(
      `${GOOGLE_CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
      'create Google Calendar event',
    );
  }

  private async patchGoogleEvent(
    accessToken: string,
    calendarId: string,
    eventId: string,
    payload: GoogleCalendarEventPayload,
  ) {
    await this.googleCalendarFetch(
      `${GOOGLE_CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
      'update Google Calendar event',
    );
  }

  private async deleteGoogleEvent(accessToken: string, calendarId: string, eventId: string) {
    const url = `${GOOGLE_CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`;
    let lastErrorBody = '';

    for (let attempt = 0; attempt <= GCAL_MAX_RETRIES; attempt += 1) {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (response.ok || response.status === 404) {
        return;
      }

      lastErrorBody = await response.text();
      const shouldRetry =
        this.isRateLimitError(response.status, lastErrorBody) && attempt < GCAL_MAX_RETRIES;

      if (!shouldRetry) {
        throw new BadRequestException(`Failed to delete Google Calendar event: ${lastErrorBody}`);
      }

      const delayMs = this.getRetryDelayMs(response, attempt);
      this.logger.warn(
        `Google Calendar rate limit while delete Google Calendar event, retry ${attempt + 1}/${GCAL_MAX_RETRIES} in ${delayMs}ms`,
      );
      await this.sleep(delayMs);
    }

    throw new BadRequestException(`Failed to delete Google Calendar event: ${lastErrorBody}`);
  }
}
