import dayjs from 'dayjs';
import type { TrialLessonBookingRequestItem } from '@/services';
import { mapTutorBookingStatusToUi } from '@/lib/trial-booking-status';

export type ScheduleStudentItem = {
  id: string;
  name: string;
  avatarUrl?: string;
  mezonUserId: string | null;
  completedLessons: number;
  upcomingLessons: number;
  hasTrial: boolean;
  hasSubscription: boolean;
  nextLessonAt: string | null;
};

type StudentAccumulator = {
  id: string;
  name: string;
  avatarUrl?: string;
  mezonUserId: string | null;
  completedLessons: number;
  upcomingLessons: number;
  hasTrial: boolean;
  hasSubscription: boolean;
  nextLessonAt: string | null;
};

export function buildStudentItemsFromLessons(
  items: TrialLessonBookingRequestItem[],
  timezoneName: string,
): ScheduleStudentItem[] {
  const now = dayjs().tz(timezoneName);
  const byStudent = new Map<string, StudentAccumulator>();

  for (const item of items) {
    const uiStatus = mapTutorBookingStatusToUi(item.status);
    if (uiStatus !== 'confirmed' && uiStatus !== 'completed') continue;

    const start = dayjs(item.startAt).tz(timezoneName);
    if (!start.isValid()) continue;

    const end = start.add(item.durationMinutes, 'minute');
    const isCompleted = end.isBefore(now) || uiStatus === 'completed';
    const isSubscription = item.scheduleKind === 'subscription';

    let row = byStudent.get(item.studentId);
    if (!row) {
      row = {
        id: item.studentId,
        name: item.studentName,
        avatarUrl: item.studentAvatarUrl,
        mezonUserId: item.studentMezonUserId,
        completedLessons: 0,
        upcomingLessons: 0,
        hasTrial: false,
        hasSubscription: false,
        nextLessonAt: null,
      };
      byStudent.set(item.studentId, row);
    }

    if (isSubscription) row.hasSubscription = true;
    else row.hasTrial = true;

    if (isCompleted) {
      row.completedLessons += 1;
      continue;
    }

    row.upcomingLessons += 1;
    if (!row.nextLessonAt || start.isBefore(dayjs(row.nextLessonAt))) {
      row.nextLessonAt = item.startAt;
    }
  }

  return Array.from(byStudent.values()).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
  );
}
