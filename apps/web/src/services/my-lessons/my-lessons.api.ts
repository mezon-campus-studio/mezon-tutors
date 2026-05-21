import type {
  MyLessonApiCategory,
  MyLessonApiItem,
  MyLessonApiStatus,
  MyLessonsApiResponse,
  MyLessonTutorApiItem,
  MyLessonWeekDayApiItem,
} from "@mezon-tutors/shared";
import { CALENDAR_CONFIG } from "@mezon-tutors/shared";
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
};

export type TutorItem = {
  id: string;
  name: string;
  avatar: string;
  teaches: string;
  availability: string;
  completedLessons: number;
  nextLessonLabel: string;
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

const roundToHalfHour = (hour: number): number => {
  const wholeHour = Math.floor(hour);
  const minutes = (hour - wholeHour) * 60;

  if (minutes < 15) {
    return wholeHour;
  }
  if (minutes < 45) {
    return wholeHour + 0.5;
  }
  return wholeHour + 1;
};

const mapLesson = (item: MyLessonApiItem): LessonItem => {
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
    dateLabel: item.date_label,
    timeLabel: item.time_label,
    dayIndex: item.day_index,
    startHour: roundToHalfHour(item.start_hour),
    endHour: roundToHalfHour(item.end_hour),
    source: item.source ?? "trial",
  };
};

const mapTutor = (item: MyLessonTutorApiItem): TutorItem => ({
  id: item.id,
  name: item.name,
  avatar: item.avatar,
  teaches: item.teaches,
  availability: item.availability,
  completedLessons: item.completed_lessons,
  nextLessonLabel: item.next_lesson_label,
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

  const hourSet = new Set([...defaultHours, ...(data.week_hours || [])]);

  if (lessons.length > 0) {
    lessons.forEach((lesson) => {
      const start = Math.floor(lesson.startHour);
      const end = Math.ceil(lesson.endHour);
      for (let h = start; h <= end; h++) hourSet.add(h);
    });

    if (currentHour !== undefined) hourSet.add(Math.floor(currentHour));
  }

  const weekHours = Array.from(hourSet).sort((a, b) => a - b);

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

    const calendarLessons = data.calendar_lessons.map(mapLesson);

    return {
      calendar: mapCalendarMeta(data, calendarLessons, timezoneName ?? "UTC"),
      calendarLessons,
      upcomingLessons: data.upcoming_lessons.map(mapLesson),
      previousLessons: data.previous_lessons.map(mapLesson),
      tutors: data.tutors.map(mapTutor),
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
