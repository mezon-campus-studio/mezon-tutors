"use client";

import { CalendarRange } from "lucide-react";
import { useTranslations } from "next-intl";
import type {
  LessonItem,
  MyLessonsCalendarMeta,
} from "@/services/my-lessons/my-lessons.api";
import MyLessonsCalendarCard from "./MyLessonsCalendarCard";

type MyLessonsCalendarSectionProps = {
  calendar: MyLessonsCalendarMeta;
  lessons: LessonItem[];
  onPrevWeek?: () => void;
  onNextWeek?: () => void;
  onGoToToday?: () => void;
  isCurrentWeek?: boolean;
};

export default function MyLessonsCalendarSection({
  calendar,
  lessons,
  onPrevWeek,
  onNextWeek,
  onGoToToday,
  isCurrentWeek,
}: MyLessonsCalendarSectionProps) {
  const t = useTranslations("MyLessons");

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#7c3aed,#ec4899)] text-white shadow-md shadow-violet-300/40">
          <CalendarRange className="size-5" />
        </div>
        <div className="leading-tight">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-500">
            Schedule
          </p>
          <h2 className="text-xl font-extrabold text-slate-900 md:text-2xl">
            {t("tabs.calendar")}
          </h2>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-violet-100 bg-white p-3 shadow-sm shadow-violet-100/40 sm:p-5">
        <MyLessonsCalendarCard
          lessons={lessons}
          calendar={calendar}
          onPrevWeek={onPrevWeek}
          onNextWeek={onNextWeek}
          onGoToToday={onGoToToday}
          isCurrentWeek={isCurrentWeek}
        />
      </div>
    </div>
  );
}
