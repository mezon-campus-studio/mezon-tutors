import type { ReactNode } from 'react';

export type CalendarViewMode = 'week' | 'month' | 'day';

export type CalendarType = 'myLessons' | 'mySchedule';

export type CalendarSlotState = 'available' | 'selected' | 'occupied' | 'blocked' | 'pending';

export type CalendarWeekDay = {
  shortLabel: string;
  dateLabel: string;
  fullDate?: Date;
};

export type CalendarTimeSlot = {
  hour: number;
  dayIndex: number;
  state?: CalendarSlotState;
  data?: unknown;
};

export type CalendarEvent<T = unknown> = {
  id: string;
  dayIndex: number;
  startHour: number;
  endHour?: number;
  data: T;
};

export type CalendarRowModel =
  | { type: 'hour'; hour: number }
  | { type: 'gap'; startHour: number; endHour: number; hourCount: number };

export type MobileCalendarItemBase = {
  id: string;
  dayIndex: number;
  timeLabel: string;
  category?: string;
  onCardPress?: () => void;
};

export type MobileCalendarPersonInfo = {
  name: string;
  avatar?: string;
  role?: 'tutor' | 'student';
};

export type MobileCalendarItem = MobileCalendarItemBase & {
  title: string;
  person: MobileCalendarPersonInfo;
  actionLabel?: string;
  onAction?: () => void;
};

export type MobileCalendarMeta = {
  title: string;
  weekDays: CalendarWeekDay[];
  currentDayIndex?: number;
};

export type BaseCalendarProps<TEvent = unknown> = {
  type: CalendarType;
  weekDays: CalendarWeekDay[];
  weekHours: number[];
  events?: CalendarEvent<TEvent>[];
  currentDayIndex?: number;
  currentHour?: number;
  readonly?: boolean;
  enableGapCollapse?: boolean;
  minGapHours?: number;
  onSlotClick?: (dayIndex: number, hour: number) => void;
  onEventClick?: (event: CalendarEvent<TEvent>, anchorRect: DOMRect) => void;
  renderEvent?: (event: CalendarEvent<TEvent>, isCompact: boolean) => ReactNode;
  renderSlot?: (dayIndex: number, hour: number, state?: CalendarSlotState) => ReactNode;
  isCompact?: boolean;
};

