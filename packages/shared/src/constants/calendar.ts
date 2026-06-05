import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

export const CALENDAR_CONFIG = {
  MIN_GAP_HOURS: 2,
  TIME_COLUMN_WIDTH: {
    COMPACT: 66,
    NORMAL: 78,
  },
  ROW_HEIGHT: {
    COMPACT: 78,
    NORMAL: 88,
  },
  GAP_ROW_HEIGHT: {
    COMPACT: 52,
    NORMAL: 60,
  },
  HEADER_HEIGHT: 72,
  EVENT_WIDTH: {
    COMPACT: 122,
    NORMAL: 136,
  },
  DAYS_PER_WEEK: 7,
  SCHEDULE_VIEWER: {
    SLOT_MINUTES: 30,
    COMPACT_BLOCK_HOURS: 4,
    MODAL_MAX_HEIGHT: 'calc(85vh - 240px)',
  },
  DEFAULT_VISIBLE_RANGE: {
    MIN: 0,
    MAX: 23,
  },
} as const;

export const MOBILE_CALENDAR_CONFIG = {
  base: {
    containerGap: 14,
    weekDaysGap: 6,
    weekDaysWrap: 'nowrap',
  },
  navigation: {
    iconSize: 18,
    buttonPadding: 8,
    buttonBorderRadius: 999,
    titleFontSize: 28,
  },
  weekDay: {
    width: '14.285%',
    minWidth: 40,
    maxWidth: 48,
    borderRadius: 12,
    contentGap: 1.5,
    dayFontSize: 10,
    dayLineHeight: 12,
    dateFontSize: 20,
    dateLineHeight: 24,
    padding: {
      vertical: 8,
      horizontal: 4,
    },
  },
  variants: {
    myLessons: {
      navigationTitleFontSize: 28,
      weekDay: {
        dayFontSize: 10,
        dateFontSize: 20,
      },
    },
    tutorSchedule: {
      navigationTitleFontSize: 24,
      weekDay: {
        dayFontSize: 10,
        dateFontSize: 20,
      },
      style: {
        selectedBorderWidth: 2,
        selectedBorderColorToken: '$tutorsDetailPrimaryText',
        selectedBackgroundToken: '$myLessonsPrimaryButton',
        selectedDayTextToken: '$myLessonsPrimaryButtonText',
        selectedDateTextToken: '$myLessonsPrimaryButtonText',
        inactiveDayTextToken: '$myLessonsLessonsSecondaryText',
        inactiveDateTextToken: '$tutorsDetailPrimaryText',
      },
    },
    mySchedule: {
      navigationTitleFontSize: 28,
      weekDay: {
        dayFontSize: 10,
        dateFontSize: 20,
      },
    },
  },
} as const;

export const TUTOR_SCHEDULE_SLOT_CONTAINER_PROPS = {
  paddingVertical: 10,
  paddingHorizontal: 12,
  borderRadius: 10,
  borderWidth: 1,
  borderColor: '$tutorsDetailScheduleColumnBorder',
  backgroundColor: '$tutorsDetailScheduleSlotEmptyBackground',
  minWidth: 120,
  width: '100%',
} as const;

export type CalendarThemeConfig = {
  showTimeline: boolean;
  showGridLines: boolean;
  showTimelineGrid?: boolean;
  showDayColumnGridLines?: boolean;
  showGridOuterBorder?: boolean;
  showNowLine: boolean;
  cardBorder?: boolean;
  cardBorderRadius?: number;
  cardPadding?: number;
  rowHeight?: number;
  gapRowHeight?: number;
  eventMaxWidth?: number;
  eventMaxHeight?: number;
  eventBorderRadius?: number;
  eventPadding?: number;
  eventTopPadding?: number;
  showEmptySlots?: boolean;
  emptySlotText?: string;
  emptySlotStyle?: 'text' | 'outlinedCard';
  emptySlotBorderStyle?: 'solid' | 'dashed';
  emptySlotMaxWidth?: number;
  emptySlotMinHeight?: number;
  emptySlotBorderRadius?: number;
  emptySlotMergeHours?: number;
  weekendNoSlotDays?: number[];
  weekendNoSlotLabel?: string;
  translationNamespace?: string;
};

export const DEFAULT_THEME_CONFIG: CalendarThemeConfig = {
  showTimeline: true,
  showGridLines: true,
  showNowLine: false,
  cardBorder: true,
  cardBorderRadius: 16,
  cardPadding: 16,
  eventMaxWidth: undefined,
  eventMaxHeight: undefined,
  eventBorderRadius: 12,
  eventPadding: 8,
  eventTopPadding: undefined,
  showEmptySlots: false,
  emptySlotText: undefined,
  emptySlotStyle: 'text',
  emptySlotBorderStyle: 'solid',
  emptySlotMaxWidth: undefined,
  emptySlotMinHeight: undefined,
  emptySlotBorderRadius: 12,
  emptySlotMergeHours: 1,
  weekendNoSlotDays: [],
  weekendNoSlotLabel: undefined,
  translationNamespace: 'MySchedule',
};

export const CALENDAR_THEME_CONFIG: Record<string, CalendarThemeConfig> = {
  myLessons: {
    showTimeline: true,
    showGridLines: true,
    showTimelineGrid: true,
    showDayColumnGridLines: false,
    showGridOuterBorder: true,
    showNowLine: true,
    cardBorder: false,
    cardBorderRadius: 0,
    cardPadding: 0,
    eventBorderRadius: 14,
    eventTopPadding: 4,
    eventPadding: 4,
    rowHeight: 172,
    gapRowHeight: 92,
    showEmptySlots: false,
    translationNamespace: 'MyLessons',
  },
  tutorSchedule: {
    showTimeline: true,
    showGridLines: false,
    showGridOuterBorder: true,
    showNowLine: false,
    cardBorder: false,
    cardBorderRadius: 0,
    cardPadding: 0,
    eventMaxWidth: 120,
    eventMaxHeight: 68,
    eventBorderRadius: 12,
    eventPadding: 8,
    eventTopPadding: 8,
    showEmptySlots: true,
    emptySlotText: undefined,
    emptySlotStyle: 'outlinedCard',
    emptySlotBorderStyle: 'solid',
    emptySlotMaxWidth: 110,
    emptySlotMinHeight: 56,
    emptySlotBorderRadius: 12,
    emptySlotMergeHours: 1,
    translationNamespace: 'MySchedule',
  },
  mySchedule: {
    showTimeline: true,
    showGridLines: true,
    showTimelineGrid: true,
    showDayColumnGridLines: false,
    showGridOuterBorder: true,
    showNowLine: true,
    cardBorder: true,
    cardBorderRadius: 16,
    cardPadding: 16,
    eventBorderRadius: 14,
    eventTopPadding: 4,
    eventPadding: 4,
    rowHeight: 172,
    gapRowHeight: 92,
    showEmptySlots: false,
    translationNamespace: 'MySchedule',
  },
  booking: {
    showTimeline: true,
    showGridLines: true,
    showNowLine: false,
    cardBorder: true,
    cardBorderRadius: 16,
    cardPadding: 16,
    eventBorderRadius: 12,
    eventTopPadding: 8,
    showEmptySlots: false,
    translationNamespace: 'MySchedule',
  },
};

export function getFallbackWeekHours(): number[] {
  const currentHour = dayjs().hour();
  const startHour = Math.max(0, currentHour - 2);
  const endHour = Math.min(23, startHour + 4);

  return Array.from({ length: endHour - startHour + 1 }, (_, index) => startHour + index);
}

export function buildFallbackWeekDays() {
  const now = dayjs();
  const dayOfWeek = now.day();
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = now.subtract(mondayOffset, 'day');

  return Array.from({ length: 7 }, (_, index) => {
    const date = monday.add(index, 'day');

    return {
      shortLabel: date.format('ddd'),
      dateLabel: date.format('DD'),
    };
  });
}

export function calculateDynamicTimelineHours(
  events: Array<{ startsAt: Date | string; endsAt: Date | string }>,
  availabilitySlots?: Array<{ startTime: string; endTime: string }>
): number[] {
  const hours = new Set<number>();

  events.forEach((event) => {
    const startHour = dayjs(event.startsAt).tz('Asia/Ho_Chi_Minh').hour();
    const endHour = dayjs(event.endsAt).tz('Asia/Ho_Chi_Minh').hour();

    for (let h = startHour; h <= endHour; h++) {
      hours.add(h);
    }
  });

  if (availabilitySlots) {
    availabilitySlots.forEach((slot) => {
      const [startHour] = slot.startTime.split(':').map(Number);
      const [endHour] = slot.endTime.split(':').map(Number);

      for (let h = startHour; h <= endHour; h++) {
        hours.add(h);
      }
    });
  }

  if (hours.size === 0) {
    return [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
  }

  const sortedHours = Array.from(hours).sort((a, b) => a - b);
  const minHour = sortedHours[0];
  const maxHour = sortedHours[sortedHours.length - 1];

  return Array.from({ length: maxHour - minHour + 1 }, (_, i) => minHour + i);
}

export type MobileCalendarCardConfig = {
  borderRadius: number;
  padding: number;
  gap: number;
  avatar: { size: number; borderRadius: number };
  title: { fontSize: number; lineHeight: number };
  subtitle: { fontSize: number; lineHeight: number };
  time: { fontSize: number; lineHeight: number; iconSize: number };
  button: {
    fontSize: number;
    borderRadius: number;
    padding: { vertical: number; horizontal: number };
  };
};

export type MobileCalendarCategoryConfig = {
  dotSize: number;
  fontSize: number;
  padding: { horizontal: number; vertical: number };
  borderRadius: number;
};

export type MobileCalendarEmptyConfig = {
  minHeight: number;
  borderRadius: number;
  padding: number;
  fontSize: number;
};

export type ReusableMobileCalendarConfig = {
  type: 'myLessons' | 'tutorSchedule' | 'mySchedule';
  weekDay: {
    minWidth: number;
    maxWidth: number;
    width: number;
    padding: { vertical: number; horizontal: number };
    contentGap: number;
    borderRadius: number;
    dayFontSize: number;
    dayLineHeight: number;
    dateFontSize: number;
    dateLineHeight: number;
  };
  navigation: {
    iconSize: number;
    buttonPadding: number;
    buttonBorderRadius: number;
    titleFontSize: number;
  };
  card: MobileCalendarCardConfig;
  category: MobileCalendarCategoryConfig;
  empty: MobileCalendarEmptyConfig;
};

export const MOBILE_CALENDAR_CONFIGS: Record<
  'myLessons' | 'tutorSchedule' | 'mySchedule',
  ReusableMobileCalendarConfig
> = {
  myLessons: {
    type: 'myLessons',
    weekDay: {
      minWidth: 40,
      maxWidth: 48,
      width: 40,
      padding: { vertical: 8, horizontal: 4 },
      contentGap: 2,
      borderRadius: 12,
      dayFontSize: 10,
      dayLineHeight: 12,
      dateFontSize: 20,
      dateLineHeight: 24,
    },
    navigation: {
      iconSize: 16,
      buttonPadding: 4,
      buttonBorderRadius: 6,
      titleFontSize: 13,
    },
    card: {
      borderRadius: 10,
      padding: 10,
      gap: 8,
      avatar: { size: 40, borderRadius: 999 },
      title: { fontSize: 13, lineHeight: 16 },
      subtitle: { fontSize: 11, lineHeight: 14 },
      time: { fontSize: 10, lineHeight: 14, iconSize: 11 },
      button: {
        fontSize: 11,
        borderRadius: 7,
        padding: { vertical: 7, horizontal: 12 },
      },
    },
    category: {
      dotSize: 6,
      fontSize: 11,
      padding: { horizontal: 10, vertical: 4 },
      borderRadius: 16,
    },
    empty: {
      minHeight: 120,
      borderRadius: 10,
      padding: 12,
      fontSize: 11,
    },
  },
  tutorSchedule: {
    type: 'tutorSchedule',
    weekDay: {
      minWidth: 40,
      maxWidth: 48,
      width: 14.285,
      padding: { vertical: 8, horizontal: 4 },
      contentGap: 2,
      borderRadius: 12,
      dayFontSize: 10,
      dayLineHeight: 12,
      dateFontSize: 20,
      dateLineHeight: 24,
    },
    navigation: {
      iconSize: 16,
      buttonPadding: 4,
      buttonBorderRadius: 6,
      titleFontSize: 13,
    },
    card: {
      borderRadius: 12,
      padding: 12,
      gap: 10,
      avatar: { size: 44, borderRadius: 999 },
      title: { fontSize: 14, lineHeight: 18 },
      subtitle: { fontSize: 12, lineHeight: 16 },
      time: { fontSize: 11, lineHeight: 14, iconSize: 12 },
      button: {
        fontSize: 12,
        borderRadius: 8,
        padding: { vertical: 8, horizontal: 14 },
      },
    },
    category: {
      dotSize: 7,
      fontSize: 12,
      padding: { horizontal: 12, vertical: 6 },
      borderRadius: 18,
    },
    empty: {
      minHeight: 140,
      borderRadius: 12,
      padding: 16,
      fontSize: 12,
    },
  },
  mySchedule: {
    type: 'mySchedule',
    weekDay: {
      minWidth: 40,
      maxWidth: 48,
      width: 40,
      padding: { vertical: 8, horizontal: 4 },
      contentGap: 2,
      borderRadius: 12,
      dayFontSize: 10,
      dayLineHeight: 12,
      dateFontSize: 20,
      dateLineHeight: 24,
    },
    navigation: {
      iconSize: 18,
      buttonPadding: 8,
      buttonBorderRadius: 999,
      titleFontSize: 28,
    },
    card: {
      borderRadius: 12,
      padding: 12,
      gap: 10,
      avatar: { size: 44, borderRadius: 999 },
      title: { fontSize: 14, lineHeight: 18 },
      subtitle: { fontSize: 12, lineHeight: 16 },
      time: { fontSize: 11, lineHeight: 14, iconSize: 12 },
      button: {
        fontSize: 12,
        borderRadius: 8,
        padding: { vertical: 8, horizontal: 14 },
      },
    },
    category: {
      dotSize: 7,
      fontSize: 12,
      padding: { horizontal: 12, vertical: 6 },
      borderRadius: 18,
    },
    empty: {
      minHeight: 140,
      borderRadius: 12,
      padding: 16,
      fontSize: 12,
    },
  },
};
