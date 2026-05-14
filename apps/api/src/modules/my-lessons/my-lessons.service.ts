import { Injectable } from '@nestjs/common';
import { ETrialLessonStatus, ESubscriptionEnrollmentStatus, EPaymentStatus, Prisma, Role } from '@mezon-tutors/db';
import dayjs = require('dayjs');
import type {
  MyLessonApiCategory,
  MyLessonApiItem,
  MyLessonTutorApiItem,
  MyLessonWeekDayApiItem,
  MyLessonsApiResponse,
} from '@mezon-tutors/shared';
import {
  subscriptionWeeklySlotsToOccurrencesInTimezone,
  type SubscriptionWeeklySlotDto,
} from '@mezon-tutors/shared';
import { PrismaService } from '../../prisma/prisma.service';

const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(timezone);

const MY_LESSONS_CALENDAR_TZ = 'Asia/Ho_Chi_Minh';

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
  constructor(private readonly prisma: PrismaService) {}

  private toUtc(input: string | Date) {
    return (dayjs)(input).utc();
  }

  private getCalendarHour(input: string | Date): number {
    const dt = (dayjs)(input).tz(MY_LESSONS_CALENDAR_TZ);
    return dt.hour() + dt.minute() / 60;
  }

  private isLessonEndAfterNow(lesson: { startAt: Date; durationMinutes: number }): boolean {
    const end = (dayjs)(lesson.startAt).add(lesson.durationMinutes, 'minute');
    return end.isAfter((dayjs)());
  }

  async getOverview(studentMezonUserId: string, weekStartDate?: string): Promise<MyLessonsApiResponse> {
    const studentId = await this.resolveStudentId(studentMezonUserId);

    if (!studentId) {
      return this.emptyResponse(weekStartDate);
    }

    const lessons = await this.prisma.trialLessonBooking.findMany({
      where: {
        studentId,
        status: {
          in: [ETrialLessonStatus.CONFIRMED, ETrialLessonStatus.COMPLETED],
        },
        paymentStatus: EPaymentStatus.SUCCEEDED,
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
      .filter(
        (lesson) =>
          lesson.status === ETrialLessonStatus.CONFIRMED && this.isLessonEndAfterNow(lesson),
      )
      .map((lesson) => this.toLessonApiItem(lesson))
      .filter((item): item is MyLessonApiItem => item !== null);
    const previousLessons = lessons
      .filter(
        (lesson) =>
          lesson.status === ETrialLessonStatus.COMPLETED ||
          (lesson.status === ETrialLessonStatus.CONFIRMED && !this.isLessonEndAfterNow(lesson)),
      )
      .map((lesson) => this.toLessonApiItem(lesson))
      .filter((item): item is MyLessonApiItem => item !== null);

    const upcomingLessonRows = lessons.filter(
      (lesson) =>
        lesson.status === ETrialLessonStatus.CONFIRMED && this.isLessonEndAfterNow(lesson),
    );
    const calendarBaseDate = this.resolveCalendarBaseDate(upcomingLessonRows, weekStartDate);
    const calendarTrialRows = this.filterLessonsByWeek(
      lessons.filter(
        (l) =>
          l.status === ETrialLessonStatus.CONFIRMED ||
          l.status === ETrialLessonStatus.COMPLETED,
      ),
      calendarBaseDate,
      weekStartDate,
    );
    const calendarLessons = calendarTrialRows
      .map((lesson) => this.toLessonCalendarApiItem(lesson))
      .filter((item): item is MyLessonApiItem => item !== null);

    const weekYmd =
      weekStartDate ??
      (dayjs)(this.getWeekStart(calendarBaseDate)).tz(MY_LESSONS_CALENDAR_TZ).format('YYYY-MM-DD');

    const { weekStart, weekEnd } = this.getDisplayWeekRange(calendarBaseDate, weekStartDate);

    const enrollments = await this.prisma.subscriptionEnrollment.findMany({
      where: {
        studentId,
        status: ESubscriptionEnrollmentStatus.ACTIVE,
        paymentStatus: EPaymentStatus.SUCCEEDED,
      },
      include: {
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

    for (const enrollment of enrollments) {
      const slots = this.parseEnrollmentWeeklySlots(enrollment.weeklySlots);
      const occ = subscriptionWeeklySlotsToOccurrencesInTimezone(weekYmd, slots);
      slots.forEach((slot, idx) => {
        const range = occ[idx];
        if (!range) {
          return;
        }
        if (range.startAt < weekStart || range.startAt >= weekEnd) {
          return;
        }
        subscriptionBounds.push(range);
        const occEnd = (dayjs)(range.endAt);
        const slotStatus: MyLessonApiItem['status'] = occEnd.isAfter((dayjs)())
          ? 'upcoming'
          : 'completed';
        const item = this.enrollmentOccurrenceToLessonItem(
          enrollment,
          range.startAt,
          range.endAt,
          idx,
          slotStatus,
        );
        subscriptionCalendarItems.push(item);
        if (slotStatus === 'upcoming') {
          subscriptionUpcomingItems.push(item);
        }
      });
    }

    const mergedCalendar = [...calendarLessons, ...subscriptionCalendarItems].sort(
      (a, b) => a.day_index - b.day_index || a.start_hour - b.start_hour || a.id.localeCompare(b.id)
    );
    const mergedUpcoming = [...upcomingLessons, ...subscriptionUpcomingItems].sort(
      (a, b) => a.day_index - b.day_index || a.start_hour - b.start_hour || a.id.localeCompare(b.id)
    );

    return {
      ...this.buildCalendarMeta(calendarTrialRows, calendarBaseDate, weekStartDate, subscriptionBounds),
      calendar_lessons: mergedCalendar,
      upcoming_lessons: mergedUpcoming,
      previous_lessons: previousLessons,
      tutors: this.buildTutorItems(lessons),
    };
  }

  private getDisplayWeekRange(
    baseDate: Date,
    weekStartDate?: string
  ): { weekStart: Date; weekEnd: Date } {
    if (weekStartDate) {
      const parsed = (dayjs)(weekStartDate).tz(MY_LESSONS_CALENDAR_TZ).startOf('day');
      return { weekStart: parsed.toDate(), weekEnd: parsed.add(7, 'day').toDate() };
    }
    const weekStart = this.getWeekStart(baseDate);
    return { weekStart, weekEnd: (dayjs)(weekStart).add(7, 'day').toDate() };
  }

  private parseEnrollmentWeeklySlots(value: Prisma.JsonValue): SubscriptionWeeklySlotDto[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value as unknown as SubscriptionWeeklySlotDto[];
  }

  private enrollmentOccurrenceToLessonItem(
    enrollment: {
      id: string;
      tutorId: string;
      weeklySlots: Prisma.JsonValue;
      tutor: TrialLessonBookingWithTutor['tutor'];
    },
    startAt: Date,
    endAt: Date,
    slotIdx: number,
    calendarStatus: MyLessonApiItem['status'],
  ): MyLessonApiItem {
    const ymd = (dayjs)(startAt).tz(MY_LESSONS_CALENDAR_TZ).format('YYYY-MM-DD');
    const subj = enrollment.tutor.subject?.trim();
    return {
      id: `sub-${enrollment.id}-${slotIdx}-${ymd}`,
      source: 'subscription',
      subject: subj ? `${subj} · Subscription` : 'Subscription',
      tutor_id: enrollment.tutorId,
      tutor_user_id: enrollment.tutor.userId,
      tutor_name: this.getTutorName(enrollment.tutor),
      tutor_avatar: enrollment.tutor.avatar || enrollment.tutor.user.avatar,
      tutor_mezon_user_id: enrollment.tutor.user.mezonUserId,
      category: this.buildCategoryKey(enrollment.tutor.subject, enrollment.tutor.subject),
      status: calendarStatus,
      date_label: this.formatDateLabel(startAt),
      time_label: this.formatTimeLabel(startAt, endAt),
      day_index: this.toCalendarDayIndex(startAt),
      start_hour: this.getCalendarHour(startAt),
      end_hour: this.getCalendarHour(endAt),
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

  private toLessonCalendarApiItem(lesson: TrialLessonBookingWithTutor): MyLessonApiItem | null {
    const base = this.toLessonApiItem(lesson);
    if (!base) {
      return null;
    }
    if (
      lesson.status === ETrialLessonStatus.CONFIRMED &&
      !this.isLessonEndAfterNow(lesson)
    ) {
      return { ...base, status: 'completed' };
    }
    return base;
  }

  private toLessonApiItem(lesson: TrialLessonBookingWithTutor): MyLessonApiItem | null {
    const status = this.mapLessonStatus(lesson.status);

    if (!status) {
      return null;
    }

    const endAt = this.toUtc(lesson.startAt).add(lesson.durationMinutes, 'minutes').toDate();

    return {
      id: lesson.id,
      subject: lesson.tutor.subject,
      tutor_id: lesson.tutor.id,
      tutor_user_id: lesson.tutor.userId,
      tutor_name: this.getTutorName(lesson.tutor),
      tutor_avatar: lesson.tutor.avatar || lesson.tutor.user.avatar,
      tutor_mezon_user_id: lesson.tutor.user.mezonUserId,
      category: this.buildCategoryKey(lesson.tutor.subject, lesson.tutor.subject),
      status,
      date_label: this.formatDateLabel(lesson.startAt),
      time_label: this.formatTimeLabel(lesson.startAt, endAt),
      day_index: this.toCalendarDayIndex(lesson.startAt),
      start_hour: this.getCalendarHour(lesson.startAt),
      end_hour: this.getCalendarHour(endAt),
    };
  }

  private buildTutorItems(lessons: TrialLessonBookingWithTutor[]): MyLessonTutorApiItem[] {
    const tutorMap = new Map<
      string,
      {
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
          name: this.getTutorName(lesson.tutor),
          avatar: lesson.tutor.avatar || lesson.tutor.user.avatar,
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
        name: tutor.name,
        avatar: tutor.avatar,
        teaches: Array.from(tutor.subjects).sort().join(', '),
        availability: tutor.availability,
        completed_lessons: tutor.completedLessons,
        next_lesson_label: tutor.nextLessonAt ? this.toUtc(tutor.nextLessonAt).format('ddd, h:mm A') : '',
        rating_average: tutor.ratingAverage,
        review_count: tutor.reviewCount,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  private formatTutorAvailability(slots: TrialLessonBookingWithTutor['tutor']['availability']): string {
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

  private mapLessonStatus(status: ETrialLessonStatus): MyLessonApiItem['status'] | null {
    switch (status) {
      case ETrialLessonStatus.CONFIRMED:
        return 'upcoming';
      case ETrialLessonStatus.COMPLETED:
        return 'completed';
      default:
        return null;
    }
  }

  private formatDateLabel(date: Date): string {
    return (dayjs)(date).tz(MY_LESSONS_CALENDAR_TZ).format('ddd, MMM DD');
  }

  private formatTime(date: Date): string {
    return (dayjs)(date).tz(MY_LESSONS_CALENDAR_TZ).format('HH:mm');
  }

  private formatTimeLabel(start: Date, end: Date): string {
    return `${this.formatTime(start)} - ${this.formatTime(end)}`;
  }

  private toCalendarDayIndex(date: Date): number {
    const dow = (dayjs)(date).tz(MY_LESSONS_CALENDAR_TZ).day();
    return dow === 0 ? 6 : dow - 1;
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

  private resolveCalendarBaseDate(upcomingLessonRows: TrialLessonBookingWithTutor[], weekStartDate?: string): Date {
    if (weekStartDate) {
      const parsed = (dayjs)(weekStartDate).tz(MY_LESSONS_CALENDAR_TZ).startOf('day');
      if (parsed.isValid()) {
        return parsed.toDate();
      }
    }

    return (dayjs)().tz(MY_LESSONS_CALENDAR_TZ).toDate();
  }

  private filterLessonsByWeek(lessons: TrialLessonBookingWithTutor[], baseDate: Date, weekStartDate?: string): TrialLessonBookingWithTutor[] {
    let weekStart: Date;
    let weekEnd: Date;
    
    if (weekStartDate) {
      const parsed = (dayjs)(weekStartDate).tz(MY_LESSONS_CALENDAR_TZ).startOf('day');
      weekStart = parsed.toDate();
      weekEnd = parsed.add(7, 'day').toDate();
    } else {
      weekStart = this.getWeekStart(baseDate);
      weekEnd = (dayjs)(weekStart).add(7, 'day').toDate();
    }

    return lessons.filter((lesson) => lesson.startAt >= weekStart && lesson.startAt < weekEnd);
  }

  private buildCalendarMeta(
    upcomingLessonRows: TrialLessonBookingWithTutor[],
    baseDate: Date,
    weekStartDate?: string,
    subscriptionBounds?: { startAt: Date; endAt: Date }[]
  ): Pick<
    MyLessonsApiResponse,
    'calendar_title' | 'week_days' | 'week_hours' | 'current_day_index' | 'current_hour'
  > {
    const now = (dayjs)().tz(MY_LESSONS_CALENDAR_TZ);
    const currentHour = now.hour() + now.minute() / 60;

    let weekStart: Date;
    let weekDays: MyLessonWeekDayApiItem[];

    if (weekStartDate) {
      const parsed = (dayjs)(weekStartDate).tz(MY_LESSONS_CALENDAR_TZ).startOf('day');
      weekStart = parsed.toDate();

      weekDays = Array.from({ length: 7 }, (_, index) => {
        const day = parsed.add(index, 'day');
        return {
          short_label: day.format('ddd'),
          date_label: day.format('DD'),
        };
      });
    } else {
      weekStart = this.getWeekStart(baseDate);
      weekDays = this.buildWeekDays(weekStart);
    }

    const weekEndMs = (dayjs)(weekStart).add(7, 'day').valueOf();

    const [startHour, endHour] = this.resolveHourRange(
      upcomingLessonRows,
      Math.floor(currentHour),
      subscriptionBounds
    );
    const weekHours = Array.from({ length: endHour - startHour + 1 }, (_, index) => startHour + index);

    const nowMs = now.valueOf();
    const weekStartMs = weekStart.getTime();
    const isCurrentWeek = nowMs >= weekStartMs && nowMs < weekEndMs;
    const currentDayIndex = isCurrentWeek ? this.toCalendarDayIndex(now.toDate()) : undefined;

    return {
      calendar_title: (dayjs)(weekStart).tz(MY_LESSONS_CALENDAR_TZ).format('MMMM YYYY'),
      week_days: weekDays,
      week_hours: weekHours,
      current_day_index: currentDayIndex,
      current_hour: isCurrentWeek ? currentHour : undefined,
    };
  }

  private getWeekStart(date: Date): Date {
    const d = (dayjs)(date).tz(MY_LESSONS_CALENDAR_TZ).startOf('day');
    const idx = this.toCalendarDayIndex(date);
    return d.subtract(idx, 'day').toDate();
  }

  private buildWeekDays(weekStart: Date): MyLessonWeekDayApiItem[] {
    return Array.from({ length: 7 }, (_, index) => {
      const day = (dayjs)(weekStart).tz(MY_LESSONS_CALENDAR_TZ).add(index, 'day');

      return {
        short_label: day.format('ddd'),
        date_label: day.format('DD'),
      };
    });
  }

  private resolveHourRange(
    upcomingLessonRows: TrialLessonBookingWithTutor[],
    fallbackHour: number,
    extraBounds?: { startAt: Date; endAt: Date }[]
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
        minHour = Math.min(minHour, this.getCalendarHour(lesson.startAt));
        maxHour = Math.max(maxHour, this.getCalendarHour(endAt));
      }
    }

    if (hasExtras) {
      for (const b of extraBounds!) {
        minHour = Math.min(minHour, this.getCalendarHour(b.startAt));
        maxHour = Math.max(maxHour, this.getCalendarHour(b.endAt));
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

  private emptyResponse(weekStartDate?: string): MyLessonsApiResponse {
    const baseDate = weekStartDate
      ? (dayjs)(weekStartDate).tz(MY_LESSONS_CALENDAR_TZ).startOf('day').toDate()
      : this.resolveCalendarBaseDate([], weekStartDate);

    return {
      ...this.buildCalendarMeta([], baseDate, weekStartDate, undefined),
      calendar_lessons: [],
      upcoming_lessons: [],
      previous_lessons: [],
      tutors: [],
    };
  }
}
