"use client";

import { CalendarDays, GraduationCap, ListChecks } from "lucide-react";
import { useTranslations } from "next-intl";

type MyLessonsTab = "lessons" | "calendar" | "tutors";

type MyLessonsHeaderProps = {
  activeTab: MyLessonsTab;
  onTabChange: (tab: MyLessonsTab) => void;
};

const TAB_ICONS: Record<MyLessonsTab, typeof ListChecks> = {
  lessons: ListChecks,
  calendar: CalendarDays,
  tutors: GraduationCap,
};

const tabs: MyLessonsTab[] = ["lessons", "calendar", "tutors"];

export default function MyLessonsHeader({
  activeTab,
  onTabChange,
}: MyLessonsHeaderProps) {
  const t = useTranslations("MyLessons");

  return (
    <div className="inline-flex w-fit items-center gap-1 rounded-full border border-violet-100 bg-white p-1 shadow-sm shadow-violet-100/40">
      {tabs.map((tab) => {
        const Icon = TAB_ICONS[tab];
        const isActive = activeTab === tab;
        return (
          <button
            key={tab}
            type="button"
            onClick={() => onTabChange(tab)}
            className={`group relative inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300 ${
              isActive
                ? "bg-[linear-gradient(110deg,#faf5ff,#fdf2f8)] text-violet-700 ring-1 ring-violet-100"
                : "text-slate-600 hover:text-violet-700"
            }`}
          >
            <Icon
              className={`size-4 transition-colors ${
                isActive ? "text-violet-600" : "text-slate-400"
              }`}
            />
            {t(`tabs.${tab}`)}
          </button>
        );
      })}
    </div>
  );
}
