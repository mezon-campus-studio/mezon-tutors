export type DashboardScheduleWeekDay = {
  shortLabel: string;
  dateLabel: string;
};

export type DashboardScheduleCalendarEvent = {
  id: string;
  dayIndex: number;
  startHour: number;
  endHour: number;
};

export type DashboardScheduleCalendarLabels = {
  today: string;
  weekBadge: string;
  prevWeekAria?: string;
  nextWeekAria?: string;
  emptyDay?: string;
};
