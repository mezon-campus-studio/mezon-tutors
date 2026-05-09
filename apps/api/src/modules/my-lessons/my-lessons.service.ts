import { Injectable } from '@nestjs/common';
import { ETrialLessonStatus, Prisma, Role } from '@mezon-tutors/db';
import dayjs = require('dayjs');
import type {
  MyLessonApiCategory,
  MyLessonApiItem,
  MyLessonTutorApiItem,
  MyLessonWeekDayApiItem,
  MyLessonsApiResponse,
} from '@mezon-tutors/shared';
import { PrismaService } from '../../prisma/prisma.service';

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
  constructor(private readonly prisma: PrismaService) {}

  private toUtc(input: string | Date) {
    return (dayjs as any)(input).utc();
  }

  private getUtcHour(input: string | Date): number {
    const dt = this.toUtc(input);
    return dt.hour() + dt.minute() / 60;
  }

  async getOverview(studentMezonUserId: string, weekStartDate?: string): Promise<MyLessonsApiResponse> {
    const studentId = await this.resolveStudentId(studentMezonUserId);

    if (!studentId) {
      return this.emptyResponse(weekStartDate);
    }

    const lessons = await this.prisma.trialLessonBooking.findMany({
      where: {
        studentId,
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
      .filter((lesson) => lesson.status === ETrialLessonStatus.CONFIRMED)
      .map((lesson) => this.toLessonApiItem(lesson))
      .filter((item): item is MyLessonApiItem => item !== null);
    const previousLessons = lessons
      .filter((lesson) => lesson.status === ETrialLessonStatus.COMPLETED)
      .map((lesson) => this.toLessonApiItem(lesson))
      .filter((item): item is MyLessonApiItem => item !== null);

    const upcomingLessonRows = lessons.filter((lesson) => lesson.status === ETrialLessonStatus.CONFIRMED);
    const calendarBaseDate = this.resolveCalendarBaseDate(upcomingLessonRows, weekStartDate);
    const calendarLessons = this.filterLessonsByWeek(upcomingLessonRows, calendarBaseDate, weekStartDate)
      .map((lesson) => this.toLessonApiItem(lesson))
      .filter((item): item is MyLessonApiItem => item !== null);

    return {
      ...this.buildCalendarMeta(upcomingLessonRows, calendarBaseDate, weekStartDate),
      calendar_lessons: calendarLessons,
      upcoming_lessons: upcomingLessons,
      previous_lessons: previousLessons,
      tutors: this.buildTutorItems(lessons),
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
      tutor_name: this.getTutorName(lesson.tutor),
      tutor_avatar: lesson.tutor.avatar || lesson.tutor.user.avatar,
      category: this.buildCategoryKey(lesson.tutor.subject, lesson.tutor.subject),
      status,
      date_label: this.formatDateLabel(lesson.startAt),
      time_label: this.formatTimeLabel(lesson.startAt, endAt),
      day_index: this.toCalendarDayIndex(lesson.startAt),
      start_hour: this.getUtcHour(lesson.startAt),
      end_hour: this.getUtcHour(endAt),
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
        const nextLessonAt = lesson.status === ETrialLessonStatus.CONFIRMED ? lesson.startAt : null;

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
    return this.toUtc(date).format('ddd, MMM DD');
  }

  private formatTime(date: Date): string {
    return this.toUtc(date).format('HH:mm');
  }

  private formatTimeLabel(start: Date, end: Date): string {
    return `${this.formatTime(start)} - ${this.formatTime(end)}`;
  }

  private toCalendarDayIndex(date: Date): number {
    const utcDay = this.toUtc(date).day();
    return utcDay === 0 ? 6 : utcDay - 1;
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
      const parsed = this.toUtc(weekStartDate);
      if (parsed.isValid()) {
        return parsed.toDate();
      }
    }
    
    return this.toUtc(new Date()).toDate();
  }

  private filterLessonsByWeek(lessons: TrialLessonBookingWithTutor[], baseDate: Date, weekStartDate?: string): TrialLessonBookingWithTutor[] {
    let weekStart: Date;
    let weekEnd: Date;
    
    if (weekStartDate) {
      const parsed = (dayjs as any)(weekStartDate).tz('Asia/Ho_Chi_Minh').startOf('day');
      weekStart = parsed.toDate();
      weekEnd = parsed.add(7, 'day').toDate();
    } else {
      weekStart = this.getWeekStart(baseDate);
      weekEnd = this.toUtc(weekStart).add(7, 'day').toDate();
    }

    return lessons.filter((lesson) => lesson.startAt >= weekStart && lesson.startAt < weekEnd);
  }

  private buildCalendarMeta(upcomingLessonRows: TrialLessonBookingWithTutor[], baseDate: Date, weekStartDate?: string): Pick<
    MyLessonsApiResponse,
    'calendar_title' | 'week_days' | 'week_hours' | 'current_day_index' | 'current_hour'
  > {
    const now = this.toUtc(new Date());
    const currentHour = now.hour();

    let weekStart: Date;
    let weekDays: MyLessonWeekDayApiItem[];
    
    if (weekStartDate) {
      const parsed = (dayjs as any)(weekStartDate).tz('Asia/Ho_Chi_Minh').startOf('day');
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
    
    const weekEnd = this.toUtc(weekStart).add(7, 'day');

    const [startHour, endHour] = this.resolveHourRange(upcomingLessonRows, currentHour);
    const weekHours = Array.from({ length: endHour - startHour + 1 }, (_, index) => startHour + index);

    const nowTimestamp = now.valueOf();
    const weekStartTimestamp = this.toUtc(weekStart).valueOf();
    const weekEndTimestamp = weekEnd.valueOf();
    const isCurrentWeek = nowTimestamp >= weekStartTimestamp && nowTimestamp < weekEndTimestamp;
    const currentDayIndex = isCurrentWeek ? this.toCalendarDayIndex(now.toDate()) : undefined;

    return {
      calendar_title: this.toUtc(baseDate).format('MMMM YYYY'),
      week_days: weekDays,
      week_hours: weekHours,
      current_day_index: currentDayIndex,
      current_hour: isCurrentWeek ? currentHour : undefined,
    };
  }

  private getWeekStart(date: Date): Date {
    return this.toUtc(date).startOf('day').subtract(this.toCalendarDayIndex(date), 'day').toDate();
  }

  private buildWeekDays(weekStart: Date): MyLessonWeekDayApiItem[] {
    return Array.from({ length: 7 }, (_, index) => {
      const day = this.toUtc(weekStart).add(index, 'day');

      return {
        short_label: day.format('ddd'),
        date_label: day.format('DD'),
      };
    });
  }

  private resolveHourRange(upcomingLessonRows: TrialLessonBookingWithTutor[], fallbackHour: number): [number, number] {
    if (!upcomingLessonRows.length) {
      const startHour = Math.max(0, fallbackHour - 2);
      const endHour = Math.min(23, startHour + 4);
      return [startHour, endHour];
    }

    let minHour = 23;
    let maxHour = 0;

    for (const lesson of upcomingLessonRows) {
      const endAt = this.toUtc(lesson.startAt).add(lesson.durationMinutes, 'minutes').toDate();
      minHour = Math.min(minHour, this.getUtcHour(lesson.startAt));
      maxHour = Math.max(maxHour, this.getUtcHour(endAt));
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
      ? this.toUtc(weekStartDate).toDate()
      : this.resolveCalendarBaseDate([]);

    return {
      ...this.buildCalendarMeta([], baseDate),
      calendar_lessons: [],
      upcoming_lessons: [],
      previous_lessons: [],
      tutors: [],
    };
  }
}
