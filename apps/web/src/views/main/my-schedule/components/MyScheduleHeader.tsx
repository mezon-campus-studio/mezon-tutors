"use client";

import { CalendarDays, ListChecks, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import DashboardViewTabs from "@/components/dashboard/DashboardViewTabs";

export type MyScheduleTab = "lessons" | "calendar" | "students";

type MyScheduleHeaderProps = {
  activeTab: MyScheduleTab;
  onTabChange: (tab: MyScheduleTab) => void;
};

const TAB_ICONS = {
  lessons: ListChecks,
  calendar: CalendarDays,
  students: Users,
} as const;

const tabs: MyScheduleTab[] = ["lessons", "calendar", "students"];

export default function MyScheduleHeader({
  activeTab,
  onTabChange,
}: MyScheduleHeaderProps) {
  const t = useTranslations("Dashboard.mySchedule");

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
