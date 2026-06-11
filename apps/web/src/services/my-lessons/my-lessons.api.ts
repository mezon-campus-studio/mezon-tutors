import type {
  MyLessonApiCategory,
  MyLessonApiItem,
  MyLessonApiStatus,
  MyLessonsApiResponse,
  MyLessonTutorApiItem,
  MyLessonWeekDayApiItem,
} from "@mezon-tutors/shared";
import {
  addCalendarEventHourTicks,
  CALENDAR_CONFIG,
  calendarEventHoursFromDayjs,
  calendarEventHoursFromDecimals,
  DEFAULT_TIMEZONE,
  filterCalendarWeekHourTicks,
} from "@mezon-tutors/shared";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { useAtomValue } from "jotai";
import {
  detectBrowserTimezone,
  parseYmdInTimezone,
  resolveUserTimezone,
} from "@/lib/timezone";
import { isAuthenticatedAtom, userAtom } from "@/store";
import { apiClient } from "../api-client";
import { myLessonsQueryKey } from "./my-lessons.qkey";

dayjs.extend(utc);
dayjs.extend(timezone);

const BASE = "/my-lessons";

enum MyLessonsStatusEnum {
  Upcoming = "upcoming",
  Completed = "completed",
}

export type LessonCategory = string;
export type LessonStatus = "upcoming" | "completed";

export type WeekDay = {
  shortLabel: string;
  dateLabel: string;
  fullDate?: Date;
};

export type LessonItem = {
  id: string;
  subject: string;
  tutor: string;
  tutorId: string;
  tutorUserId: string;
  tutorAvatar: string;
  tutorMezonUserId?: string | null;
  category: LessonCategory;
  status: LessonStatus;
  dateLabel: string;
  timeLabel: string;
  dayIndex: number;
  startHour: number;
  endHour: number;
  rating?: number;
  source?: "trial" | "subscription";
  startAt?: string;
  durationMinutes?: number;
  grossAmount?: number;
  currency?: string;
  trialBookingStatus?: "confirmed" | "cancelled" | "completed";
  trialPaymentStatus?: string;
  subscriptionEnrollmentId?: string;
  subscriptionSlotIndex?: number;
  subscriptionSlotStatus?: string;
  enrollmentStatus?: string;
  enrollmentPaymentStatus?: string;
  rescheduleRequestSubmitted?: boolean;
  canComplain?: boolean;
  complaintStatus?: string;
};

export type TutorItem = {
  id: string;
  userId: string;
  mezonUserId: string | null;
  name: string;
  avatar: string;
  teaches: string;
  availability: string;
  completedLessons: number;
  nextLessonLabel: string;
  nextLessonAt?: string | null;
  ratingAverage: number;
  reviewCount: number;
};

export type MyLessonsCalendarMeta = {
  title: string;
  weekDays: WeekDay[];
  weekHours: number[];
  currentDayIndex?: number;
  currentHour?: number;
};

export type MyLessonsViewData = {
  calendar: MyLessonsCalendarMeta;
  calendarLessons: LessonItem[];
  upcomingLessons: LessonItem[];
  previousLessons: LessonItem[];
  tutors: TutorItem[];
};

const mapCategory = (category: MyLessonApiCategory): LessonCategory => {
  const normalized = category
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

  return normalized || "other";
};

const mapStatus = (status: MyLessonApiStatus): LessonStatus =>
  status === MyLessonsStatusEnum.Upcoming ? "upcoming" : "completed";

const mapWeekDay = (
  item: MyLessonWeekDayApiItem,
  timezoneName: string,
): WeekDay => ({
  shortLabel: item.short_label,
  dateLabel: item.date_label,
  fullDate: item.date_ymd
    ? parseYmdInTimezone(item.date_ymd, timezoneName).toDate()
    : undefined,
});

function lessonDisplayFromStartAt(
  startAtIso: string,
  durationMinutes: number,
  timezoneName: string,
  weekStartYmd?: string,
): Pick<LessonItem, "dateLabel" | "timeLabel" | "dayIndex" | "startHour" | "endHour"> {
  const start = dayjs.utc(startAtIso).tz(timezoneName);
  if (!start.isValid()) {
    return {
      dateLabel: "—",
      timeLabel: "—",
      dayIndex: 0,
      startHour: 0,
      endHour: 0,
    };
  }
  const end = start.add(durationMinutes, "minute");
  let dayIndex = 0;
  if (weekStartYmd) {
    const weekStart = parseYmdInTimezone(weekStartYmd, timezoneName).startOf("day");
    dayIndex = Math.max(
      0,
      Math.min(6, start.startOf("day").diff(weekStart, "day")),
    );
  }
  const { startHour, endHour } = calendarEventHoursFromDayjs(start, end);

  return {
    dateLabel: start.format("ddd, MMM DD"),
    timeLabel: `${start.format("HH:mm")} - ${end.format("HH:mm")}`,
    dayIndex,
    startHour,
    endHour,
  };
}

const readComplaintFields = (item: MyLessonApiItem) => {
  const raw = item as MyLessonApiItem & {
    canComplain?: boolean;
    complaintStatus?: string;
  };
  const complaintStatus = item.complaint_status ?? raw.complaintStatus;
  const canComplain = item.can_complain ?? raw.canComplain;

  return {
    canComplain: canComplain === true,
    complaintStatus: complaintStatus?.trim() || undefined,
  };
};

const mapLesson = (
  item: MyLessonApiItem,
  timezoneName: string,
  weekStartYmd?: string,
): LessonItem => {
  const { canComplain, complaintStatus } = readComplaintFields(item);
  const durationMinutes =
    item.duration_minutes && item.duration_minutes > 0
      ? item.duration_minutes
      : item.start_at
        ? 60
        : undefined;

  const display =
    item.start_at && durationMinutes != null
      ? lessonDisplayFromStartAt(
          item.start_at,
          durationMinutes,
          timezoneName,
          weekStartYmd,
        )
      : {
          dateLabel: item.date_label,
          timeLabel: item.time_label,
          dayIndex: item.day_index,
          ...calendarEventHoursFromDecimals(item.start_hour, item.end_hour),
        };

  return {
    id: item.id,
    subject: item.subject,
    tutor: item.tutor_name,
    tutorId: item.tutor_id,
    tutorUserId: item.tutor_user_id,
    tutorAvatar: item.tutor_avatar,
    tutorMezonUserId: item.tutor_mezon_user_id,
    category: mapCategory(item.category),
    status: mapStatus(item.status),
    ...display,
    source: item.source ?? "trial",
    startAt: item.start_at,
    durationMinutes,
    grossAmount: item.gross_amount,
    currency: item.currency,
    trialBookingStatus: item.trial_booking_status,
    trialPaymentStatus: item.trial_payment_status,
    subscriptionEnrollmentId: item.subscription_enrollment_id,
    subscriptionSlotIndex: item.subscription_slot_index,
    subscriptionSlotStatus: item.subscription_slot_status,
    enrollmentStatus: item.enrollment_status,
    enrollmentPaymentStatus: item.enrollment_payment_status,
    rescheduleRequestSubmitted: item.reschedule_request_submitted ?? false,
    canComplain,
    complaintStatus,
  };
};

const mapTutor = (item: MyLessonTutorApiItem, timezoneName: string): TutorItem => ({
  id: item.id,
  userId: item.user_id,
  mezonUserId: item.mezon_user_id,
  name: item.name,
  avatar: item.avatar,
  teaches: item.teaches,
  availability: item.availability,
  completedLessons: item.completed_lessons,
  nextLessonLabel: item.next_lesson_at
    ? dayjs.utc(item.next_lesson_at).tz(timezoneName).format("ddd, h:mm A")
    : "",
  nextLessonAt: item.next_lesson_at ?? null,
  ratingAverage: item.rating_average,
  reviewCount: item.review_count,
});

const mapCalendarMeta = (
  data: MyLessonsApiResponse,
  lessons: LessonItem[],
  timezoneName: string,
): MyLessonsCalendarMeta => {
  const { MIN, MAX } = CALENDAR_CONFIG.DEFAULT_VISIBLE_RANGE;

  const defaultHours = Array.from({ length: MAX - MIN + 1 }, (_, i) => MIN + i);

  const currentHour = data.current_hour;

  const hourSet = new Set([
    ...defaultHours,
    ...filterCalendarWeekHourTicks(data.week_hours || []),
  ]);

  if (lessons.length > 0) {
    lessons.forEach((lesson) => {
      addCalendarEventHourTicks(hourSet, lesson.startHour, lesson.endHour);
    });

    if (currentHour !== undefined) {
      hourSet.add(
        Math.min(MAX, Math.floor(currentHour)),
      );
    }
  }

  const weekHours = filterCalendarWeekHourTicks(Array.from(hourSet)).sort(
    (a, b) => a - b,
  );

  return {
    title: data.calendar_title,
    weekDays: data.week_days.map((day) => mapWeekDay(day, timezoneName)),
    weekHours,
    currentDayIndex: data.current_day_index,
    currentHour,
  };
};

export const myLessonsApi = {
  async getOverview(
    weekStartDate?: string,
    timezoneName?: string,
  ): Promise<MyLessonsViewData> {
    const params: Record<string, string> = {};

    if (weekStartDate) {
      params.week_start_date = weekStartDate;
    }
    if (timezoneName) {
      params.timezone = timezoneName;
    }

    const data = await apiClient.get<MyLessonsApiResponse>(BASE, { params });
    const tz = timezoneName ?? DEFAULT_TIMEZONE;

    const calendarLessons = data.calendar_lessons.map((item) =>
      mapLesson(item, tz, weekStartDate),
    );

    return {
      calendar: mapCalendarMeta(data, calendarLessons, tz),
      calendarLessons,
      upcomingLessons: data.upcoming_lessons.map((item) => mapLesson(item, tz)),
      previousLessons: data.previous_lessons.map((item) => mapLesson(item, tz)),
      tutors: data.tutors.map((item) => mapTutor(item, tz)),
    };
  },
};

export const useGetMyLessonsOverview = (
  weekStartDate?: string,
  timezoneName?: string,
) => {
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const user = useAtomValue(userAtom);
  const effectiveTimezone =
    timezoneName ?? resolveUserTimezone(user?.timezone, detectBrowserTimezone());

  return useQuery({
    queryKey: myLessonsQueryKey.overview(weekStartDate, effectiveTimezone),
    queryFn: () => myLessonsApi.getOverview(weekStartDate, effectiveTimezone),
    enabled: isAuthenticated && Boolean(effectiveTimezone),
    staleTime: 0,
    gcTime: 1000 * 60 * 10,
    refetchOnMount: true,
  });
};
