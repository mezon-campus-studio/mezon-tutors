"use client";

import { CalendarDays, GraduationCap, ListChecks } from "lucide-react";
import { useTranslations } from "next-intl";
import DashboardViewTabs from "@/components/dashboard/DashboardViewTabs";

type MyLessonsTab = "lessons" | "calendar" | "tutors";

type MyLessonsHeaderProps = {
  activeTab: MyLessonsTab;
  onTabChange: (tab: MyLessonsTab) => void;
};

const TAB_ICONS = {
  lessons: ListChecks,
  calendar: CalendarDays,
  tutors: GraduationCap,
} as const;

const tabs: MyLessonsTab[] = ["lessons", "calendar", "tutors"];

export default function MyLessonsHeader({
  activeTab,
  onTabChange,
}: MyLessonsHeaderProps) {
  const t = useTranslations("MyLessons");

  return (
    <DashboardViewTabs
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={onTabChange}
      getLabel={(tab) => t(`tabs.${tab}`)}
      tabIcons={TAB_ICONS}
    />
  );
}
