'use client';

import { useLocale } from 'next-intl';
import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CALENDAR_CONFIG, MOBILE_CALENDAR_CONFIG } from '@mezon-tutors/shared';
import { Button } from '@/components/ui';
import { formatCalendarTitle, formatWeekDays } from '../utils/format-locale';
import type { CalendarType, CalendarWeekDay } from '../types';

type MobileWeekCalendarProps = {
  type: CalendarType;
  title: string;
  weekDays: CalendarWeekDay[];
  selectedDayIndex: number;
  currentDayIndex?: number;
  onSelectDay: (dayIndex: number) => void;
  onPrevWeek?: () => void;
  onNextWeek?: () => void;
};

export function MobileWeekCalendar({
  type,
  title,
  weekDays,
  selectedDayIndex,
  currentDayIndex,
  onSelectDay,
  onPrevWeek,
  onNextWeek,
}: MobileWeekCalendarProps) {
  const locale = useLocale();
  const localizedTitle = useMemo(() => formatCalendarTitle(title, locale), [title, locale]);
  const localizedWeekDays = useMemo(() => formatWeekDays(weekDays, locale), [weekDays, locale]);

  const baseConfig = MOBILE_CALENDAR_CONFIG;
  const variantKey = type;
  const variantConfig = MOBILE_CALENDAR_CONFIG.variants[variantKey] ?? MOBILE_CALENDAR_CONFIG.variants.myLessons;
  const weekDayConfig = baseConfig.weekDay;
  const dayFontSize = variantConfig.weekDay.dayFontSize ?? weekDayConfig.dayFontSize;
  const dateFontSize = variantConfig.weekDay.dateFontSize ?? weekDayConfig.dateFontSize;
  const titleFontSize = variantConfig.navigationTitleFontSize ?? baseConfig.navigation.titleFontSize;

  return (
    <div className="flex flex-col w-full" style={{ gap: baseConfig.base.containerGap }}>
      <div className="flex items-center justify-between w-full">
        <Button
          variant="ghost"
          size="icon"
          onClick={onPrevWeek}
          disabled={!onPrevWeek}
          style={{
            padding: baseConfig.navigation.buttonPadding,
            borderRadius: baseConfig.navigation.buttonBorderRadius,
          }}
        >
          <ChevronLeft style={{ width: baseConfig.navigation.iconSize, height: baseConfig.navigation.iconSize }} />
        </Button>

        <h2
          className="font-bold text-center text-gray-900"
          style={{ fontSize: titleFontSize }}
        >
          {localizedTitle}
        </h2>

        <Button
          variant="ghost"
          size="icon"
          onClick={onNextWeek}
          disabled={!onNextWeek}
          style={{
            padding: baseConfig.navigation.buttonPadding,
            borderRadius: baseConfig.navigation.buttonBorderRadius,
          }}
        >
          <ChevronRight style={{ width: baseConfig.navigation.iconSize, height: baseConfig.navigation.iconSize }} />
        </Button>
      </div>

      <div
        className="flex w-full justify-between items-center"
        style={{
          flexWrap: 'nowrap',
        }}
      >
        {localizedWeekDays.slice(0, CALENDAR_CONFIG.DAYS_PER_WEEK).map((day, index) => {
          const isActive = selectedDayIndex === index;
          const isToday = currentDayIndex === index;

          return (
            <button
              key={`${day.shortLabel}-${day.dateLabel}-${index}`}
              onClick={() => onSelectDay(index)}
              className={`
                flex flex-col items-center flex-shrink-0 transition-colors
                ${isActive ? 'bg-primary text-white' : 'bg-transparent'}
                ${isToday && !isActive ? 'border border-primary' : ''}
              `}
              style={{
                paddingTop: weekDayConfig.padding.vertical,
                paddingBottom: weekDayConfig.padding.vertical,
                paddingLeft: weekDayConfig.padding.horizontal,
                paddingRight: weekDayConfig.padding.horizontal,
                borderRadius: weekDayConfig.borderRadius,
                minWidth: weekDayConfig.minWidth,
                maxWidth: weekDayConfig.maxWidth,
                width: weekDayConfig.width,
                gap: weekDayConfig.contentGap,
              }}
            >
              <span
                className={`font-semibold uppercase ${
                  isActive ? 'text-white' : isToday ? 'text-primary' : 'text-gray-500'
                }`}
                style={{
                  fontSize: dayFontSize,
                  lineHeight: `${weekDayConfig.dayLineHeight}px`,
                }}
              >
                {day.shortLabel}
              </span>
              <span
                className={`font-bold ${
                  isActive ? 'text-white' : isToday ? 'text-primary' : 'text-gray-900'
                }`}
                style={{
                  fontSize: dateFontSize,
                  lineHeight: `${weekDayConfig.dateLineHeight}px`,
                }}
              >
                {day.dateLabel}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
