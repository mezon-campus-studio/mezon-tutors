import { Injectable } from '@nestjs/common';
import { ETrialLessonStatus, EPaymentStatus } from '@mezon-tutors/db';
import { DEFAULT_TIMEZONE } from '@mezon-tutors/shared';
import dayjs = require('dayjs');
import timezone = require('dayjs/plugin/timezone');
import utc = require('dayjs/plugin/utc');
import { PrismaService } from '../../prisma/prisma.service';

dayjs.extend(utc);
dayjs.extend(timezone);

export interface ScheduleEvent {
  id: string;
  dayIndex: number;
  startHour: number;
  endHour: number;
  status: 'available' | 'upcoming' | 'pending' | 'blocked';
  title: string;
  studentName: string;
  timeLabel: string;
}

@Injectable()
export class MyScheduleService {
  constructor(private readonly prisma: PrismaService) {}

  private toDecimalHour(dt: dayjs.Dayjs): number {
    return dt.hour() + dt.minute() / 60;
  }

  private parseTimeToDecimalHour(time: string): number {
    const [hourPart = '0', minutePart = '0'] = time.split(':');
    const hour = Number.parseInt(hourPart, 10);
    const minute = Number.parseInt(minutePart, 10);
    return hour + minute / 60;
  }

  private formatDecimalHourToTime(hour: number): string {
    const totalMinutes = Math.round(hour * 60);
    const normalized = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
    const hh = Math.floor(normalized / 60)
      .toString()
      .padStart(2, '0');
    const mm = (normalized % 60).toString().padStart(2, '0');
    return `${hh}:${mm}`;
  }

  async getMySchedule(tutorMezonUserId?: string, weekStartDate?: string) {
    const emptyResponse = { availability: [], lessons: [] };

    if (!tutorMezonUserId) return emptyResponse;

    const user = await this.prisma.user.findUnique({
      where: { mezonUserId: tutorMezonUserId },
      select: { 
        id: true,
        tutorProfile: {
          select: { id: true }
        }
      },
    });
    if (!user?.tutorProfile) return emptyResponse;

    const tutorProfileId = user.tutorProfile.id;

    let monday: dayjs.Dayjs;
    if (weekStartDate) {
      monday = dayjs(weekStartDate).tz(DEFAULT_TIMEZONE).startOf('day');
    } else {
      const now = dayjs();
      const dayOfWeek = now.day();
      const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      monday = now.subtract(mondayOffset, 'day').startOf('day');
    }
    const sunday = monday.add(6, 'day').endOf('day');

    const [availability, bookings] = await Promise.all([
      this.prisma.tutorAvailability.findMany({
        where: {
          tutorId: tutorProfileId,
          isActive: true,
        },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      }),
      this.prisma.trialLessonBooking.findMany({
        where: {
          tutorId: tutorProfileId,
          startAt: {
            gte: monday.toDate(),
            lte: sunday.toDate(),
          },
          status: {
            in: [ETrialLessonStatus.CONFIRMED, ETrialLessonStatus.COMPLETED],
          },
          paymentStatus: EPaymentStatus.SUCCEEDED,
        },
        include: {
          student: {
            select: {
              id: true,
              mezonUserId: true,
              username: true,
              avatar: true,
            },
          },
        },
        orderBy: {
          startAt: 'asc',
        },
      }),
    ]);

    const availabilitySlots = availability.map((slot) => ({
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      isActive: slot.isActive,
    }));

    const lessonEvents: ScheduleEvent[] = bookings.map((booking) => {
      const startsAt = dayjs(booking.startAt).tz(DEFAULT_TIMEZONE);
      const endsAt = startsAt.add(booking.durationMinutes, 'minute');
      const dayIndex = startsAt.day() === 0 ? 6 : startsAt.day() - 1;

      let status: 'upcoming' | 'pending' | 'blocked';
      if (booking.status === ETrialLessonStatus.CANCELLED) {
        status = 'blocked';
      } else if (booking.status === ETrialLessonStatus.PENDING) {
        status = 'pending';
      } else {
        status = 'upcoming';
      }

      return {
        id: booking.id,
        dayIndex,
        startHour: this.toDecimalHour(startsAt),
        endHour: this.toDecimalHour(endsAt),
        status,
        title: 'Trial Lesson',
        studentName: booking.student.username,
        timeLabel: `${startsAt.format('HH:mm')} - ${endsAt.format('HH:mm')}`,
      };
    });

    const availabilityEvents: ScheduleEvent[] = availability.flatMap((slot) => {
      const dayIndex = slot.dayOfWeek === 0 ? 6 : slot.dayOfWeek - 1;
      const slotStartHour = this.parseTimeToDecimalHour(slot.startTime);
      const slotEndHour = this.parseTimeToDecimalHour(slot.endTime);

      const overlappingLessons = lessonEvents.filter(
        (lesson) =>
          lesson.dayIndex === dayIndex &&
          lesson.startHour < slotEndHour &&
          lesson.endHour > slotStartHour
      );

      if (overlappingLessons.length === 0) {
        return [
          {
            id: `availability-${slot.id}`,
            dayIndex,
            startHour: slotStartHour,
            endHour: slotEndHour,
            status: 'available' as const,
            title: '',
            studentName: '',
            timeLabel: `${this.formatDecimalHourToTime(slotStartHour)} - ${this.formatDecimalHourToTime(slotEndHour)}`,
          },
        ];
      }

      const sortedLessons = overlappingLessons.sort((a, b) => a.startHour - b.startHour);
      const freeSlots: ScheduleEvent[] = [];

      let currentStart = slotStartHour;

      for (const lesson of sortedLessons) {
        if (currentStart < lesson.startHour) {
          freeSlots.push({
            id: `availability-${slot.id}-${currentStart}`,
            dayIndex,
            startHour: currentStart,
            endHour: lesson.startHour,
            status: 'available' as const,
            title: '',
            studentName: '',
            timeLabel: `${this.formatDecimalHourToTime(currentStart)} - ${this.formatDecimalHourToTime(lesson.startHour)}`,
          });
        }
        currentStart = Math.max(currentStart, lesson.endHour);
      }

      if (currentStart < slotEndHour) {
        freeSlots.push({
          id: `availability-${slot.id}-${currentStart}`,
          dayIndex,
          startHour: currentStart,
          endHour: slotEndHour,
          status: 'available' as const,
          title: '',
          studentName: '',
          timeLabel: `${this.formatDecimalHourToTime(currentStart)} - ${this.formatDecimalHourToTime(slotEndHour)}`,
        });
      }

      return freeSlots;
    });

    const allEvents = [...availabilityEvents, ...lessonEvents].sort((a, b) => {
      if (a.dayIndex !== b.dayIndex) return a.dayIndex - b.dayIndex;
      if (a.startHour !== b.startHour) return a.startHour - b.startHour;
      return a.endHour - b.endHour;
    });

    return {
      availability: availabilitySlots,
      lessons: allEvents,
    };
  }
}
