import dayjs from 'dayjs';
import { addMinutes } from './date-time';

export function getLessonEndAt(startAt: string | Date, durationMinutes: number): Date {
  return addMinutes(new Date(startAt), durationMinutes);
}

export function isLessonFinishedForComplaint(
  startAt: string | Date,
  durationMinutes: number,
  now: string | Date = new Date()
): boolean {
  const lessonEnd = dayjs(getLessonEndAt(startAt, durationMinutes)).utc();
  return !dayjs(now).utc().isBefore(lessonEnd);
}

export function isWithinLessonComplaintWindow(
  startAt: string | Date,
  durationMinutes: number,
  now: string | Date,
  disputePeriodHours: number,
): boolean {
  if (!isLessonFinishedForComplaint(startAt, durationMinutes, now)) {
    return false;
  }
  const lessonEnd = dayjs(getLessonEndAt(startAt, durationMinutes)).utc();
  const deadline = lessonEnd.add(disputePeriodHours, 'hour');
  const nowUtc = dayjs(now).utc();
  return nowUtc.isBefore(deadline) || nowUtc.isSame(deadline);
}

export function getLessonComplaintDeadline(
  startAt: string | Date,
  durationMinutes: number,
  disputePeriodHours: number,
): Date {
  return dayjs(getLessonEndAt(startAt, durationMinutes))
    .utc()
    .add(disputePeriodHours, 'hour')
    .toDate();
}
