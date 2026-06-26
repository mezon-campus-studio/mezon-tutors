import { Injectable } from '@nestjs/common';
import {
  ELessonChangeAction,
  ETrialLessonStatus,
  ESubscriptionEnrollmentStatus,
  EPaymentStatus,
  Prisma,
  Role,
} from '@mezon-tutors/db';
import dayjs = require('dayjs');
import type {
  MyLessonApiCategory,
  MyLessonApiItem,
  MyLessonTutorApiItem,
  MyLessonWeekDayApiItem,
  MyLessonsApiResponse,
} from '@mezon-tutors/shared';
import {
  DEFAULT_TIMEZONE,
  ESubscriptionLessonSlotStatus,
  isLessonFinishedForComplaint,
  isSubscriptionSlotCompleted,
  isWithinLessonComplaintWindow,
  normalizeSubscriptionSlotStatus,
  subscriptionConcreteOccurrencesSorted,
  subscriptionSlotGrossAmount,
  subscriptionSlotsOccurrencesForWeek,
  subscriptionSlotsUseConcreteDates,
  type SubscriptionWeeklySlotDto,
} from '@mezon-tutors/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { AppSettingsService } from '../app-settings/app-settings.service';

const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(timezone);

type TrialLessonBookingWithTutor = Prisma.TrialLessonBookingGetPayload<{
  include: {
    tutor: {
      include: {
        user: true;
        availability: true;
      };
    };
  };
}>;

@Injectable()
export class MyLessonsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appSettingsService: AppSettingsService,
  ) {}

  private toUtc(input: string | Date) {
    return dayjs(input).utc();
  }

  private getCalendarHour(input: string | Date, timezoneName: string): number {
    const dt = dayjs(input).tz(timezoneName);
    return dt.hour() + dt.minute() / 60;
  }

  private isLessonEndAfterNow(lesson: { startAt: Date; durationMinutes: number }): boolean {
    return !isLessonFinishedForComplaint(lesson.startAt, lesson.durationMinutes);
  }

  async getOverview(
    studentMezonUserId: string,
    weekStartDate?: string,
    timezoneName = DEFAULT_TIMEZONE
  ): Promise<MyLessonsApiResponse> {
    const studentId = await this.resolveStudentId(studentMezonUserId);

    if (!studentId) {
      return this.emptyResponse(weekStartDate, timezoneName);
    }

    const lessons = await this.prisma.trialLessonBooking.findMany({
      where: {
        studentId,
        status: {
          in: [
            ETrialLessonStatus.CONFIRMED,
            ETrialLessonStatus.COMPLETED,
            ETrialLessonStatus.CANCELLED,
          ],
        },
        paymentStatus: {
          in: [EPaymentStatus.SUCCEEDED, EPaymentStatus.REFUNDED],
        },
      },
      include: {
        tutor: {
          include: {
            user: true,
            availability: true,
          },
        },
      },
      orderBy: {
        startAt: 'asc',
      },
    });

    const upcomingLessons = lessons
      .filter((lesson) => this.isTrialInUpcomingList(lesson))
      .map((lesson) => this.toLessonApiItem(lesson, timezoneName))
      .filter((item): item is MyLessonApiItem => item !== null);
    const previousLessons = lessons
      .filter((lesson) => this.isTrialInPreviousList(lesson))
      .map((lesson) => this.toLessonApiItem(lesson, timezoneName))
      .filter((item): item is MyLessonApiItem => item !== null);

    const upcomingLessonRows = lessons.filter(
      (lesson) =>
        lesson.status === ETrialLessonStatus.CONFIRMED && this.isLessonEndAfterNow(lesson)
    );
    const calendarBaseDate = this.resolveCalendarBaseDate(
      upcomingLessonRows,
      weekStartDate,
      timezoneName
    );
    const calendarTrialRows = this.filterLessonsByWeek(
      lessons.filter(
        (l) =>
          l.status === ETrialLessonStatus.CONFIRMED ||
          l.status === ETrialLessonStatus.COMPLETED
      ),
      calendarBaseDate,
      weekStartDate,
      timezoneName
    );
    const weekStartResolved = weekStartDate
      ? this.parseWeekStartMondayYmd(weekStartDate, timezoneName)
      : dayjs(this.getWeekStart(calendarBaseDate, timezoneName)).tz(timezoneName).startOf('day');
    const weekStartDateObj = weekStartResolved.toDate();
    const weekYmd = weekStartResolved.format('YYYY-MM-DD');

    const calendarLessons = calendarTrialRows
      .map((lesson) => {
        const item = this.toLessonCalendarApiItem(lesson, timezoneName);
        if (!item) {
          return null;
        }
        return this.withCalendarColumnIndex(
          item,
          lesson.startAt,
          weekStartDateObj,
          timezoneName
        );
      })
      .filter((item): item is MyLessonApiItem => item !== null);

    const studentGroups = await this.prisma.groupMember.findMany({
      where: { userId: studentId },
      select: { groupId: true },
    });
    const groupIds = studentGroups.map((g) => g.groupId);

    const enrollments = await this.prisma.subscriptionEnrollment.findMany({
      where: {
        OR: [
          { studentId },
          { groupId: { in: groupIds } },
        ],
        status: ESubscriptionEnrollmentStatus.ACTIVE,
        paymentStatus: EPaymentStatus.SUCCEEDED,
      },
      include: {
        group: true,
        tutor: {
          include: {
            user: true,
            availability: true,
          },
        },
      },
    });

    const subscriptionBounds: { startAt: Date; endAt: Date }[] = [];
    const subscriptionCalendarItems: MyLessonApiItem[] = [];
    const subscriptionUpcomingItems: MyLessonApiItem[] = [];
    const subscriptionPreviousItems: MyLessonApiItem[] = [];

    for (const enrollment of enrollments) {
      const slots = this.parseEnrollmentWeeklySlots(enrollment.weeklySlots);
      const inWeek = subscriptionSlotsOccurrencesForWeek(
        weekYmd,
        slots,
        timezoneName,
        DEFAULT_TIMEZONE,
      );
      for (const occ of inWeek) {
        const range = { startAt: occ.startAt, endAt: occ.endAt };
        subscriptionBounds.push(range);
        const slot = slots[occ.slotIndex];
        const durationMinutes =
          slot?.durationMinutes ??
          Math.max(1, Math.round((range.endAt.getTime() - range.startAt.getTime()) / 60_000));
        const calendarStatus = this.subscriptionSlotToLessonStatus(
          slot?.status,
          range.startAt,
          durationMinutes
        );
        if (!calendarStatus) {
          continue;
        }
        const item = this.withCalendarColumnIndex(
          this.enrollmentOccurrenceToLessonItem(
            enrollment,
            range.startAt,
            range.endAt,
            occ.slotIndex,
            calendarStatus,
            timezoneName,
            studentId
          ),
          range.startAt,
          weekStartDateObj,
          timezoneName
        );
        subscriptionCalendarItems.push(item);
      }

      const allOccs = subscriptionSlotsUseConcreteDates(slots)
        ? subscriptionConcreteOccurrencesSorted(slots, DEFAULT_TIMEZONE)
        : inWeek;

      for (const occ of allOccs) {
        const slot = slots[occ.slotIndex];
        const durationMinutes =
          slot?.durationMinutes ??
          Math.max(1, Math.round((occ.endAt.getTime() - occ.startAt.getTime()) / 60_000));
        const lessonStatus = this.subscriptionSlotToLessonStatus(
          slot?.status,
          occ.startAt,
          durationMinutes
        );
        if (!lessonStatus) {
          continue;
        }
        const item = this.enrollmentOccurrenceToLessonItem(
          enrollment,
          occ.startAt,
          occ.endAt,
          occ.slotIndex,
          lessonStatus,
          timezoneName,
          studentId
        );
        if (lessonStatus === 'upcoming') {
          subscriptionUpcomingItems.push(item);
        } else if (lessonStatus === 'completed') {
          subscriptionPreviousItems.push(item);
        }
      }
    }

    const compareByStartAtAsc = (a: MyLessonApiItem, b: MyLessonApiItem) => {
      const aTs = a.start_at ? dayjs(a.start_at).valueOf() : Number.POSITIVE_INFINITY;
      const bTs = b.start_at ? dayjs(b.start_at).valueOf() : Number.POSITIVE_INFINITY;
      return aTs - bTs || a.id.localeCompare(b.id);
    };
    const compareByStartAtDesc = (a: MyLessonApiItem, b: MyLessonApiItem) => {
      const aTs = a.start_at ? dayjs(a.start_at).valueOf() : Number.NEGATIVE_INFINITY;
      const bTs = b.start_at ? dayjs(b.start_at).valueOf() : Number.NEGATIVE_INFINITY;
      return bTs - aTs || a.id.localeCompare(b.id);
    };

    const mergedCalendar = [...calendarLessons, ...subscriptionCalendarItems].sort(
      (a, b) => a.day_index - b.day_index || a.start_hour - b.start_hour || a.id.localeCompare(b.id)
    );
    const mergedUpcoming = [...upcomingLessons, ...subscriptionUpcomingItems].sort(compareByStartAtAsc);
    const mergedPrevious = [...previousLessons, ...subscriptionPreviousItems].sort(compareByStartAtDesc);

    const rescheduleKeys = await this.loadRescheduleRequestKeys(studentId);
    const complaintKeys = await this.loadComplaintKeys(studentId);
    const settings = await this.appSettingsService.getSettings();
    const annotate = (item: MyLessonApiItem) =>
      this.annotateComplaintFields(
        this.annotateRescheduleRequestSubmitted(item, rescheduleKeys),
        complaintKeys,
        settings.disputePeriodHours,
      );

    return {
      ...this.buildCalendarMeta(
        calendarTrialRows,
        calendarBaseDate,
        weekStartDate,
        subscriptionBounds,
        timezoneName
      ),
      calendar_lessons: mergedCalendar.map(annotate),
      upcoming_lessons: mergedUpcoming.map(annotate),
      previous_lessons: mergedPrevious.map(annotate),
      tutors: this.buildTutorItems(lessons, timezoneName),
    };
  }

  private async loadRescheduleRequestKeys(studentId: string): Promise<{
    trialBookingIds: Set<string>;
    subscriptionSlotKeys: Set<string>;
  }> {
    const rows = await this.prisma.findCancelRescheduleReasons({
      studentId,
      action: ELessonChangeAction.RESCHEDULE,
    });

    const trialBookingIds = new Set<string>();
    const subscriptionSlotKeys = new Set<string>();

    for (const row of rows) {
      if (row.trialLessonBookingId) {
        trialBookingIds.add(row.trialLessonBookingId);
      }
      if (
        row.subscriptionEnrollmentId != null &&
        row.subscriptionSlotIndex != null &&
        row.originalStartAt
      ) {
        subscriptionSlotKeys.add(
          this.buildSubscriptionRescheduleKey(
            row.subscriptionEnrollmentId,
            row.subscriptionSlotIndex,
            row.originalStartAt
          )
        );
      }
    }

    return { trialBookingIds, subscriptionSlotKeys };
  }

  private buildSubscriptionRescheduleKey(
    enrollmentId: string,
    slotIndex: number,
    startAt: string | Date
  ): string {
    return `${enrollmentId}:${slotIndex}:${dayjs(startAt).utc().toISOString()}`;
  }

  private annotateRescheduleRequestSubmitted(
    item: MyLessonApiItem,
    keys: { trialBookingIds: Set<string>; subscriptionSlotKeys: Set<string> }
  ): MyLessonApiItem {
    let submitted = false;

    if (item.source === 'trial') {
      submitted = keys.trialBookingIds.has(item.id);
    } else if (
      item.source === 'subscription' &&
      item.subscription_enrollment_id &&
      item.subscription_slot_index != null &&
      item.start_at
    ) {
      submitted = keys.subscriptionSlotKeys.has(
        this.buildSubscriptionRescheduleKey(
          item.subscription_enrollment_id,
          item.subscription_slot_index,
          item.start_at
        )
      );
    }

    return { ...item, reschedule_request_submitted: submitted };
  }

  private async loadComplaintKeys(studentId: string): Promise<{
    trialByBookingId: Map<string, string>;
    subscriptionByKey: Map<string, string>;
  }> {
    try {
      return await this.fetchComplaintKeys(studentId);
    } catch {
      return { trialByBookingId: new Map(), subscriptionByKey: new Map() };
    }
  }

  private async fetchComplaintKeys(studentId: string): Promise<{
    trialByBookingId: Map<string, string>;
    subscriptionByKey: Map<string, string>;
  }> {
    const rows = await this.prisma.lessonComplaint.findMany({
      where: { studentId },
      select: {
        status: true,
        trialLessonBookingId: true,
        subscriptionEnrollmentId: true,
        subscriptionSlotIndex: true,
        lessonStartAt: true,
      },
    });

    const trialByBookingId = new Map<string, string>();
    const subscriptionByKey = new Map<string, string>();

    for (const row of rows) {
      if (row.trialLessonBookingId) {
        trialByBookingId.set(row.trialLessonBookingId, row.status);
      }
      if (
        row.subscriptionEnrollmentId != null &&
        row.subscriptionSlotIndex != null
      ) {
        subscriptionByKey.set(
          this.buildSubscriptionRescheduleKey(
            row.subscriptionEnrollmentId,
            row.subscriptionSlotIndex,
            row.lessonStartAt
          ),
          row.status
        );
      }
    }

    return { trialByBookingId, subscriptionByKey };
  }

  private annotateComplaintFields(
    item: MyLessonApiItem,
    keys: {
      trialByBookingId: Map<string, string>;
      subscriptionByKey: Map<string, string>;
    },
    disputePeriodHours: number,
  ): MyLessonApiItem {
    const now = new Date();
    const duration = item.duration_minutes ?? 0;
    const startAt = item.start_at;

    let complaintStatus: string | undefined;
    if (item.source === 'trial') {
      complaintStatus = keys.trialByBookingId.get(item.id);
    } else if (
      item.source === 'subscription' &&
      item.subscription_enrollment_id &&
      item.subscription_slot_index != null &&
      startAt
    ) {
      complaintStatus = keys.subscriptionByKey.get(
        this.buildSubscriptionRescheduleKey(
          item.subscription_enrollment_id,
          item.subscription_slot_index,
          startAt
        )
      );
      if (!complaintStatus) {
        const slotPrefix = `${item.subscription_enrollment_id}:${item.subscription_slot_index}:`;
        for (const [key, status] of keys.subscriptionByKey) {
          if (key.startsWith(slotPrefix)) {
            complaintStatus = status;
            break;
          }
        }
      }
    }

    const cancelledTrial =
      item.source === 'trial' && item.trial_booking_status === 'cancelled';
    const refundedSubscriptionSlot =
      item.source === 'subscription' &&
      normalizeSubscriptionSlotStatus(item.subscription_slot_status) ===
        ESubscriptionLessonSlotStatus.REFUNDED;

    const trialPaymentOk =
      item.source !== 'trial' ||
      (item.trial_payment_status?.toUpperCase() ?? 'SUCCEEDED') === 'SUCCEEDED';

    const subscriptionPaymentOk =
      item.source !== 'subscription' ||
      item.enrollment_payment_status?.toUpperCase() === 'SUCCEEDED';

    const lessonFinished =
      startAt && duration > 0
        ? isLessonFinishedForComplaint(startAt, duration, now)
        : item.status === 'completed';

    const withinWindow =
      startAt && duration > 0
        ? isWithinLessonComplaintWindow(startAt, duration, now, disputePeriodHours)
        : false;

    const canComplain =
      !complaintStatus &&
      !cancelledTrial &&
      !refundedSubscriptionSlot &&
      lessonFinished &&
      withinWindow &&
      trialPaymentOk &&
      subscriptionPaymentOk;

    return {
      ...item,
      complaint_status: complaintStatus,
      can_complain: canComplain,
    };
  }

  private parseEnrollmentWeeklySlots(value: Prisma.JsonValue): SubscriptionWeeklySlotDto[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value as unknown as SubscriptionWeeklySlotDto[];
  }

  private subscriptionSlotToLessonStatus(
    slotStatus: string | undefined,
    startAt: Date,
    durationMinutes: number
  ): MyLessonApiItem['status'] | null {
    const normalized = normalizeSubscriptionSlotStatus(slotStatus);
    if (
      normalized === ESubscriptionLessonSlotStatus.CANCELLED ||
      normalized === ESubscriptionLessonSlotStatus.REFUNDED
    ) {
      return 'completed';
    }
    if (isSubscriptionSlotCompleted(slotStatus)) {
      return 'completed';
    }
    if (isLessonFinishedForComplaint(startAt, durationMinutes)) {
      return 'completed';
    }
    return 'upcoming';
  }

  private enrollmentOccurrenceToLessonItem(
    enrollment: {
      id: string;
      tutorId: string;
      status: ESubscriptionEnrollmentStatus;
      paymentStatus: EPaymentStatus;
      grossAmount: bigint;
      currency: string | null;
      weeklySlots: Prisma.JsonValue;
      tutor: TrialLessonBookingWithTutor['tutor'];
      group?: { name: string } | null;
      studentId: string;
    },
    startAt: Date,
    endAt: Date,
    slotIdx: number,
    calendarStatus: MyLessonApiItem['status'],
    timezoneName: string,
    viewerStudentId: string
  ): MyLessonApiItem {
    const ymd = dayjs.utc(startAt).format('YYYY-MM-DD');
    const subj = enrollment.tutor.subject?.trim();
    const slots = this.parseEnrollmentWeeklySlots(enrollment.weeklySlots);
    const slotRefundAmount = subscriptionSlotGrossAmount(
      enrollment.grossAmount,
      slots.length,
      slotIdx
    );
    return {
      id: `sub-${enrollment.id}-${slotIdx}-${ymd}`,
      source: 'subscription',
      subject: subj ? `${subj} · Subscription` : 'Subscription',
      tutor_id: enrollment.tutorId,
      tutor_user_id: enrollment.tutor.userId,
      tutor_name: this.getTutorName(enrollment.tutor),
      tutor_avatar: enrollment.tutor.user.avatar,
      tutor_mezon_user_id: enrollment.tutor.user.mezonUserId,
      category: this.buildCategoryKey(enrollment.tutor.subject, enrollment.tutor.subject),
      status: calendarStatus,
      date_label: this.formatDateLabel(startAt, timezoneName),
      time_label: this.formatTimeLabel(startAt, endAt, timezoneName),
      day_index: this.toCalendarDayIndex(startAt, timezoneName),
      start_hour: this.getCalendarHour(startAt, timezoneName),
      end_hour: this.getCalendarHour(endAt, timezoneName),
      start_at: startAt.toISOString(),
      duration_minutes: Math.round((endAt.getTime() - startAt.getTime()) / (60 * 1000)),
      subscription_enrollment_id: enrollment.id,
      subscription_slot_index: slotIdx,
      subscription_slot_status: slots[slotIdx]?.status ?? undefined,
      enrollment_status: enrollment.status,
      enrollment_payment_status: enrollment.paymentStatus,
      gross_amount: Number(slotRefundAmount),
      currency: enrollment.currency ?? undefined,
      group_name: enrollment.group?.name,
      is_payer: enrollment.studentId === viewerStudentId,
    };
  }

  private async resolveStudentId(studentMezonUserId: string): Promise<string | null> {
    if (!studentMezonUserId?.trim()) {
      return null;
    }

    const student = await this.prisma.user.findUnique({
      where: { mezonUserId: studentMezonUserId },
      select: { id: true, role: true },
    });

    if (student?.role === Role.STUDENT) {
      return student.id;
    }

    return null;
  }

  private toLessonCalendarApiItem(
    lesson: TrialLessonBookingWithTutor,
    timezoneName: string
  ): MyLessonApiItem | null {
    return this.toLessonApiItem(lesson, timezoneName);
  }

  private isTrialInUpcomingList(lesson: {
    status: ETrialLessonStatus;
    startAt: Date;
    durationMinutes: number;
  }): boolean {
    if (lesson.status !== ETrialLessonStatus.CONFIRMED) {
      return false;
    }
    return this.isLessonEndAfterNow(lesson);
  }

  private isTrialInPreviousList(lesson: {
    status: ETrialLessonStatus;
    startAt: Date;
    durationMinutes: number;
  }): boolean {
    if (lesson.status === ETrialLessonStatus.CANCELLED) {
      return true;
    }
    if (
      lesson.status === ETrialLessonStatus.COMPLETED ||
      lesson.status === ETrialLessonStatus.CONFIRMED
    ) {
      return !this.isLessonEndAfterNow(lesson);
    }
    return false;
  }

  private toLessonApiItem(
    lesson: TrialLessonBookingWithTutor,
    timezoneName: string
  ): MyLessonApiItem | null {
    const trialBookingStatus = this.mapTrialBookingStatus(lesson.status);
    if (!trialBookingStatus) {
      return null;
    }

    const endAt = this.toUtc(lesson.startAt).add(lesson.durationMinutes, 'minutes').toDate();
    const listStatus: MyLessonApiItem['status'] =
      lesson.status === ETrialLessonStatus.COMPLETED || !this.isLessonEndAfterNow(lesson)
        ? 'completed'
        : 'upcoming';

    return {
      id: lesson.id,
      subject: lesson.tutor.subject,
      tutor_id: lesson.tutor.id,
      tutor_user_id: lesson.tutor.userId,
      tutor_name: this.getTutorName(lesson.tutor),
      tutor_avatar: lesson.tutor.user.avatar,
      tutor_mezon_user_id: lesson.tutor.user.mezonUserId,
      category: this.buildCategoryKey(lesson.tutor.subject, lesson.tutor.subject),
      status: listStatus,
      date_label: this.formatDateLabel(lesson.startAt, timezoneName),
      time_label: this.formatTimeLabel(lesson.startAt, endAt, timezoneName),
      day_index: this.toCalendarDayIndex(lesson.startAt, timezoneName),
      start_hour: this.getCalendarHour(lesson.startAt, timezoneName),
      end_hour: this.getCalendarHour(endAt, timezoneName),
      source: 'trial',
      start_at: lesson.startAt.toISOString(),
      duration_minutes: lesson.durationMinutes,
      gross_amount: Number(lesson.grossAmount),
      currency: lesson.currency,
      trial_booking_status: trialBookingStatus,
      trial_payment_status: lesson.paymentStatus,
      is_payer: true,
    };
  }

  private buildTutorItems(
    lessons: TrialLessonBookingWithTutor[],
    timezoneName: string
  ): MyLessonTutorApiItem[] {
    const tutorMap = new Map<
      string,
      {
        userId: string;
        mezonUserId: string | null;
        name: string;
        avatar: string;
        subjects: Set<string>;
        availability: string;
        completedLessons: number;
        nextLessonAt: Date | null;
        ratingAverage: number;
        reviewCount: number;
      }
    >();

    for (const lesson of lessons) {
      const existing = tutorMap.get(lesson.tutor.id);

      if (!existing) {
        const isCompleted = lesson.status === ETrialLessonStatus.COMPLETED;
        const nextLessonAt =
          lesson.status === ETrialLessonStatus.CONFIRMED && this.isLessonEndAfterNow(lesson)
            ? lesson.startAt
            : null;

        tutorMap.set(lesson.tutor.id, {
          userId: lesson.tutor.userId,
          mezonUserId: lesson.tutor.user.mezonUserId,
          name: this.getTutorName(lesson.tutor),
          avatar: lesson.tutor.user.avatar,
          subjects: new Set([lesson.tutor.subject]),
          availability: this.formatTutorAvailability(lesson.tutor.availability),
          completedLessons: isCompleted ? 1 : 0,
          nextLessonAt,
          ratingAverage: Number(lesson.tutor.ratingAverage),
          reviewCount: lesson.tutor.ratingCount,
        });
        continue;
      }

      existing.subjects.add(lesson.tutor.subject);

      if (lesson.status === ETrialLessonStatus.COMPLETED) {
        existing.completedLessons += 1;
      }

      if (
        lesson.status === ETrialLessonStatus.CONFIRMED &&
        this.isLessonEndAfterNow(lesson) &&
        (!existing.nextLessonAt || lesson.startAt < existing.nextLessonAt)
      ) {
        existing.nextLessonAt = lesson.startAt;
      }
    }

    return Array.from(tutorMap.entries())
      .map(([id, tutor]) => ({
        id,
        user_id: tutor.userId,
        mezon_user_id: tutor.mezonUserId,
        name: tutor.name,
        avatar: tutor.avatar,
        teaches: Array.from(tutor.subjects).sort().join(', '),
        availability: tutor.availability,
        completed_lessons: tutor.completedLessons,
        next_lesson_label: tutor.nextLessonAt
          ? dayjs(tutor.nextLessonAt).tz(timezoneName).format('ddd, h:mm A')
          : '',
        next_lesson_at: tutor.nextLessonAt ? tutor.nextLessonAt.toISOString() : null,
        rating_average: tutor.ratingAverage,
        review_count: tutor.reviewCount,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  private formatTutorAvailability(
    slots: TrialLessonBookingWithTutor['tutor']['availability']
  ): string {
    const activeSlots = slots.filter((slot) => slot.isActive);

    if (!activeSlots.length) {
      return 'Availability not set';
    }

    const dayIndexes = activeSlots
      .map((slot) => this.normalizeAvailabilityDay(slot.dayOfWeek))
      .sort((a, b) => a - b);

    const starts = activeSlots.map((slot) => slot.startTime).sort();
    const ends = activeSlots.map((slot) => slot.endTime).sort();

    const firstDay = this.formatDayByIndex(dayIndexes[0] ?? 0);
    const lastDay = this.formatDayByIndex(dayIndexes[dayIndexes.length - 1] ?? 0);
    const firstStart = starts[0] ?? '00:00';
    const lastEnd = ends[ends.length - 1] ?? '00:00';

    return `${firstDay} - ${lastDay}, ${firstStart} - ${lastEnd}`;
  }

  private getTutorName(tutor: TrialLessonBookingWithTutor['tutor']): string {
    const fullName = `${tutor.firstName} ${tutor.lastName}`.trim();
    return fullName || tutor.user.username;
  }

  private buildCategoryKey(subject: string, fallbackCategory: string): MyLessonApiCategory {
    const normalizedSubject = subject
      .trim()
      .toLowerCase()
      .replace(/[_\s]+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    if (normalizedSubject) {
      return normalizedSubject;
    }

    return fallbackCategory.toLowerCase();
  }

  private mapTrialBookingStatus(
    status: ETrialLessonStatus
  ): MyLessonApiItem['trial_booking_status'] | null {
    switch (status) {
      case ETrialLessonStatus.CONFIRMED:
        return 'confirmed';
      case ETrialLessonStatus.CANCELLED:
        return 'cancelled';
      case ETrialLessonStatus.COMPLETED:
        return 'completed';
      default:
        return null;
    }
  }

  private formatDateLabel(date: Date, timezoneName: string): string {
    return dayjs(date).tz(timezoneName).format('ddd, MMM DD');
  }

  private formatTime(date: Date, timezoneName: string): string {
    return dayjs(date).tz(timezoneName).format('HH:mm');
  }

  private formatTimeLabel(start: Date, end: Date, timezoneName: string): string {
    return `${this.formatTime(start, timezoneName)} - ${this.formatTime(end, timezoneName)}`;
  }

  /** Monday=0 … Sunday=6 for the calendar week containing `date` (wall clock in TZ). */
  private toCalendarDayIndex(date: Date, timezoneName: string): number {
    const dow = dayjs(date).tz(timezoneName).day();
    return dow === 0 ? 6 : dow - 1;
  }

  /** Column index 0–6 = offset from `weekStart` (must match `week_days` headers). */
  private toCalendarColumnIndex(
    date: Date,
    weekStart: Date,
    timezoneName: string
  ): number {
    const start = dayjs(weekStart).tz(timezoneName).startOf('day');
    const eventDay = dayjs(date).tz(timezoneName).startOf('day');
    const diff = eventDay.diff(start, 'day');
    return Math.max(0, Math.min(6, diff));
  }

  private withCalendarColumnIndex(
    item: MyLessonApiItem,
    startAt: Date,
    weekStart: Date,
    timezoneName: string
  ): MyLessonApiItem {
    return {
      ...item,
      day_index: this.toCalendarColumnIndex(startAt, weekStart, timezoneName),
    };
  }

  private normalizeAvailabilityDay(dayOfWeek: number): number {
    if (dayOfWeek >= 0 && dayOfWeek <= 6) {
      return dayOfWeek;
    }

    if (dayOfWeek >= 1 && dayOfWeek <= 7) {
      return dayOfWeek - 1;
    }

    return 0;
  }

  private formatDayByIndex(dayIndex: number): string {
    return this.toUtc('2024-01-01').add(dayIndex, 'day').format('ddd');
  }

  private resolveCalendarBaseDate(
    upcomingLessonRows: TrialLessonBookingWithTutor[],
    weekStartDate?: string,
    timezoneName = DEFAULT_TIMEZONE
  ): Date {
    if (weekStartDate) {
      return this.parseWeekStartMondayYmd(weekStartDate, timezoneName).toDate();
    }

    return dayjs().tz(timezoneName).toDate();
  }

  private filterLessonsByWeek(
    lessons: TrialLessonBookingWithTutor[],
    baseDate: Date,
    weekStartDate?: string,
    timezoneName = DEFAULT_TIMEZONE
  ): TrialLessonBookingWithTutor[] {
    let weekStart: Date;
    let weekEnd: Date;

    if (weekStartDate) {
      const monday = this.parseWeekStartMondayYmd(weekStartDate, timezoneName);
      weekStart = monday.toDate();
      weekEnd = monday.add(7, 'day').toDate();
    } else {
      weekStart = this.getWeekStart(baseDate, timezoneName);
      weekEnd = dayjs(weekStart).add(7, 'day').toDate();
    }

    return lessons.filter((lesson) => lesson.startAt >= weekStart && lesson.startAt < weekEnd);
  }

  private buildCalendarMeta(
    upcomingLessonRows: TrialLessonBookingWithTutor[],
    baseDate: Date,
    weekStartDate?: string,
    subscriptionBounds?: { startAt: Date; endAt: Date }[],
    timezoneName = DEFAULT_TIMEZONE
  ): Pick<
    MyLessonsApiResponse,
    'calendar_title' | 'week_days' | 'week_hours' | 'current_day_index' | 'current_hour'
  > {
    const now = dayjs().tz(timezoneName);
    const currentHour = now.hour() + now.minute() / 60;

    let weekStart: Date;
    let weekDays: MyLessonWeekDayApiItem[];

    if (weekStartDate) {
      const monday = this.parseWeekStartMondayYmd(weekStartDate, timezoneName);
      weekStart = monday.toDate();

      weekDays = Array.from({ length: 7 }, (_, index) => {
        const day = monday.add(index, 'day');
        return {
          short_label: day.format('ddd'),
          date_label: day.format('DD'),
          date_ymd: day.format('YYYY-MM-DD'),
        };
      });
    } else {
      weekStart = this.getWeekStart(baseDate, timezoneName);
      weekDays = this.buildWeekDays(weekStart, timezoneName);
    }

    const weekEndMs = dayjs(weekStart).add(7, 'day').valueOf();

    const [startHour, endHour] = this.resolveHourRange(
      upcomingLessonRows,
      Math.floor(currentHour),
      subscriptionBounds,
      timezoneName
    );
    const weekHours = Array.from(
      { length: endHour - startHour + 1 },
      (_, index) => startHour + index
    );

    const nowMs = now.valueOf();
    const weekStartMs = weekStart.getTime();
    const isCurrentWeek = nowMs >= weekStartMs && nowMs < weekEndMs;
    const currentDayIndex = isCurrentWeek
      ? this.toCalendarColumnIndex(now.toDate(), weekStart, timezoneName)
      : undefined;

    return {
      calendar_title: dayjs(weekStart).tz(timezoneName).format('MMMM YYYY'),
      week_days: weekDays,
      week_hours: weekHours,
      current_day_index: currentDayIndex,
      current_hour: isCurrentWeek ? currentHour : undefined,
    };
  }

  private parseWeekStartMondayYmd(weekStartYmd: string, timezoneName: string) {
    const parsed = dayjs.tz(weekStartYmd, 'YYYY-MM-DD', timezoneName).startOf('day');
    if (!parsed.isValid()) {
      return dayjs().tz(timezoneName).startOf('day');
    }
    const jsDay = parsed.day();
    const mondayOffset = jsDay === 0 ? 6 : jsDay - 1;
    return parsed.subtract(mondayOffset, 'day');
  }

  private getWeekStart(date: Date, timezoneName: string): Date {
    const d = dayjs(date).tz(timezoneName).startOf('day');
    const idx = this.toCalendarDayIndex(date, timezoneName);
    return d.subtract(idx, 'day').toDate();
  }

  private buildWeekDays(weekStart: Date, timezoneName: string): MyLessonWeekDayApiItem[] {
    const monday = dayjs(weekStart).tz(timezoneName).startOf('day');
    return Array.from({ length: 7 }, (_, index) => {
      const day = monday.add(index, 'day');

      return {
        short_label: day.format('ddd'),
        date_label: day.format('DD'),
        date_ymd: day.format('YYYY-MM-DD'),
      };
    });
  }

  private resolveHourRange(
    upcomingLessonRows: TrialLessonBookingWithTutor[],
    fallbackHour: number,
    extraBounds?: { startAt: Date; endAt: Date }[],
    timezoneName = DEFAULT_TIMEZONE
  ): [number, number] {
    const hasTrials = upcomingLessonRows.length > 0;
    const hasExtras = Boolean(extraBounds?.length);

    if (!hasTrials && !hasExtras) {
      const startHour = Math.max(0, fallbackHour - 2);
      const endHour = Math.min(23, startHour + 4);
      return [startHour, endHour];
    }

    let minHour = 23;
    let maxHour = 0;

    if (hasTrials) {
      for (const lesson of upcomingLessonRows) {
        const endAt = this.toUtc(lesson.startAt).add(lesson.durationMinutes, 'minutes').toDate();
        minHour = Math.min(minHour, this.getCalendarHour(lesson.startAt, timezoneName));
        maxHour = Math.max(maxHour, this.getCalendarHour(endAt, timezoneName));
      }
    }

    if (hasExtras) {
      for (const b of extraBounds!) {
        minHour = Math.min(minHour, this.getCalendarHour(b.startAt, timezoneName));
        maxHour = Math.max(maxHour, this.getCalendarHour(b.endAt, timezoneName));
      }
    }

    const currentSpan = maxHour - minHour;
    if (currentSpan < 4) {
      const paddingNeeded = 4 - currentSpan;
      const before = Math.floor(paddingNeeded / 2);
      const after = paddingNeeded - before;
      minHour = Math.max(0, minHour - before);
      maxHour = Math.min(23, maxHour + after);

      while (maxHour - minHour < 4 && minHour > 0) {
        minHour -= 1;
      }
      while (maxHour - minHour < 4 && maxHour < 23) {
        maxHour += 1;
      }
    }

    return [minHour, maxHour];
  }

  private emptyResponse(
    weekStartDate?: string,
    timezoneName = DEFAULT_TIMEZONE
  ): MyLessonsApiResponse {
    const baseDate = weekStartDate
      ? dayjs(weekStartDate).tz(timezoneName).startOf('day').toDate()
      : this.resolveCalendarBaseDate([], weekStartDate, timezoneName);

    return {
      ...this.buildCalendarMeta([], baseDate, weekStartDate, undefined, timezoneName),
      calendar_lessons: [],
      upcoming_lessons: [],
      previous_lessons: [],
      tutors: [],
    };
  }
}
