"use client";

import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import ConnectGoogleCalendarButton from "@/components/google-calendar/ConnectGoogleCalendarButton";
import { useUserTimezone } from "@/hooks";
import { getWeekStartMondayInTimezone } from "@/lib/timezone";
import { useGetMyLessonsOverview } from "@/services/my-lessons/my-lessons.api";
import MyLessonsCalendarSection from "./components/MyLessonsCalendarSection";
import MyLessonsHeader from "./components/MyLessonsHeader";
import MyLessonsPanel from "./components/MyLessonsPanel";
import MyLessonsTutorsSection from "./components/MyTutorsPanel";

type MyLessonsTab = "lessons" | "calendar" | "tutors";

dayjs.extend(utc);
dayjs.extend(timezone);

export default function MyLessonsPage() {
  const t = useTranslations("MyLessons");
  const router = useRouter();
  const userTimezone = useUserTimezone();
  const [activeTab, setActiveTab] = useState<MyLessonsTab>("calendar");
  const [selectedDate, setSelectedDate] = useState(dayjs().tz(userTimezone));

  const monday = getWeekStartMondayInTimezone(userTimezone, selectedDate);
  const weekStartDate = monday.format("YYYY-MM-DD");

  const { data, isLoading } = useGetMyLessonsOverview(
    weekStartDate,
    userTimezone,
  );

  const handlePrevWeek = () =>
    setSelectedDate((prev) => prev.subtract(7, "day"));
  const handleNextWeek = () => setSelectedDate((prev) => prev.add(7, "day"));

  const isCurrentWeek = () =>
    monday.isSame(getWeekStartMondayInTimezone(userTimezone), "day");

  const handleGoToToday = () => {
    setSelectedDate(dayjs().tz(userTimezone));
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden">
      <div className="mx-auto w-full max-w-[1320px] px-4 py-6 md:px-6 md:py-8 lg:px-8">
        <div className="flex flex-col gap-5 md:gap-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">
                {t("header.title")}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {t("header.subtitle")}
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <ConnectGoogleCalendarButton />
              <button
                type="button"
                onClick={() => router.push("/tutors")}
                className="group inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-full bg-brand-gradient px-5 text-sm font-semibold text-white shadow-md shadow-violet-300/40 transition-all hover:shadow-lg hover:shadow-violet-400/50 sm:h-10 sm:w-auto"
              >
                <Plus className="size-4" />
                {t("header.scheduleLesson")}
              </button>
            </div>
          </div>

          <MyLessonsHeader activeTab={activeTab} onTabChange={setActiveTab} />

          {isLoading && (
            <div className="flex min-h-[400px] w-full items-center justify-center rounded-2xl border border-violet-100 bg-white">
              <p className="text-sm text-slate-500">{t("screen.loading")}</p>
            </div>
          )}

          {data && !isLoading && (
            <>
              {activeTab === "calendar" && (
                <MyLessonsCalendarSection
                  calendar={data.calendar}
                  lessons={data.calendarLessons}
                  weekStartYmd={weekStartDate}
                  timezoneName={userTimezone}
                  onPrevWeek={handlePrevWeek}
                  onNextWeek={handleNextWeek}
                  onGoToToday={handleGoToToday}
                  isCurrentWeek={isCurrentWeek()}
                />
              )}

              {activeTab === "lessons" && (
                <MyLessonsPanel
                  upcomingLessons={data.upcomingLessons}
                  previousLessons={data.previousLessons}
                />
              )}

              {activeTab === "tutors" && (
                <MyLessonsTutorsSection tutors={data.tutors} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
