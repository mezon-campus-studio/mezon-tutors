'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useLocale } from 'next-intl';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import Image from 'next/image';
import { MOBILE_CALENDAR_CONFIGS, type ReusableMobileCalendarConfig } from '@mezon-tutors/shared';
import { Button } from '@/components/ui';
import { formatWeekDays, formatCalendarTitle } from '../utils/format-locale';
import type { MobileCalendarItem, MobileCalendarMeta, CalendarType } from '../types';
import type { ReactNode } from 'react';

type PersonBadgeProps = {
  name: string;
  avatar?: string;
  defaultAvatarUrl: string;
  config: ReusableMobileCalendarConfig['card']['avatar'];
};

function PersonBadge({ name, avatar, defaultAvatarUrl, config }: PersonBadgeProps) {
  const avatarUri = avatar?.trim() || defaultAvatarUrl;

  return (
    <div 
      className="overflow-hidden border border-gray-200 bg-gray-100 flex items-center justify-center flex-shrink-0"
      style={{
        width: config.size,
        height: config.size,
        borderRadius: config.borderRadius,
      }}
    >
      <Image
        src={avatarUri}
        alt={name}
        width={config.size}
        height={config.size}
        className="w-full h-full object-cover"
      />
    </div>
  );
}

type WeekDayButtonProps = {
  day: string;
  date: string;
  isActive: boolean;
  isToday: boolean;
  onPress: () => void;
  config: ReusableMobileCalendarConfig['weekDay'];
};

function WeekDayButton({ day, date, isActive, isToday, onPress, config }: WeekDayButtonProps) {
  return (
    <button
      onClick={onPress}
      className={`
        flex flex-col items-center transition-colors
        ${isActive 
          ? 'bg-primary text-white' 
          : isToday 
            ? 'border border-primary text-primary bg-white' 
            : 'bg-transparent text-gray-600 hover:bg-gray-50'
        }
      `}
      style={{
        minWidth: config.minWidth,
        maxWidth: config.maxWidth,
        width: config.width,
        paddingTop: config.padding.vertical,
        paddingBottom: config.padding.vertical,
        paddingLeft: config.padding.horizontal,
        paddingRight: config.padding.horizontal,
        borderRadius: config.borderRadius,
        gap: config.contentGap,
        flexShrink: 0,
      }}
    >
      <span 
        className={`font-semibold uppercase ${isActive ? 'text-white' : isToday ? 'text-primary' : 'text-gray-500'}`}
        style={{
          fontSize: config.dayFontSize,
          lineHeight: `${config.dayLineHeight}px`,
        }}
      >
        {day}
      </span>
      <span 
        className={`font-bold ${isActive ? 'text-white' : isToday ? 'text-primary' : 'text-gray-900'}`}
        style={{
          fontSize: config.dateFontSize,
          lineHeight: `${config.dateLineHeight}px`,
        }}
      >
        {date}
      </span>
    </button>
  );
}

type MobileCalendarCardProps = {
  item: MobileCalendarItem;
  defaultAvatarUrl: string;
  config: ReusableMobileCalendarConfig['card'];
};

function MobileCalendarCard({ item, defaultAvatarUrl, config }: MobileCalendarCardProps) {
  return (
    <div 
      className="w-full border border-gray-200 bg-white flex items-center"
      style={{
        borderRadius: config.borderRadius,
        padding: config.padding,
        gap: config.gap,
      }}
    >
      <PersonBadge
        name={item.person.name}
        avatar={item.person.avatar}
        defaultAvatarUrl={defaultAvatarUrl}
        config={config.avatar}
      />
      <div className="flex-1 flex flex-col" style={{ gap: 3 }}>
        <h3 
          className="font-extrabold uppercase text-primary"
          style={{
            fontSize: config.title.fontSize,
            lineHeight: `${config.title.lineHeight}px`,
          }}
        >
          {item.title}
        </h3>
        <p 
          className="text-gray-900"
          style={{
            fontSize: config.subtitle.fontSize,
            lineHeight: `${config.subtitle.lineHeight}px`,
          }}
        >
          {item.person.name}
        </p>
        <div className="flex items-center" style={{ gap: 4 }}>
          <Clock className="text-gray-500" style={{ width: config.time.iconSize, height: config.time.iconSize }} />
          <span 
            className="text-gray-500"
            style={{
              fontSize: config.time.fontSize,
              lineHeight: `${config.time.lineHeight}px`,
            }}
          >
            {item.timeLabel}
          </span>
        </div>
      </div>
      {item.actionLabel && item.onAction && (
        <Button
          onClick={item.onAction}
          className="bg-primary hover:bg-primary/90 text-white font-bold"
          style={{
            borderRadius: config.button.borderRadius,
            paddingTop: config.button.padding.vertical,
            paddingBottom: config.button.padding.vertical,
            paddingLeft: config.button.padding.horizontal,
            paddingRight: config.button.padding.horizontal,
            fontSize: config.button.fontSize,
          }}
        >
          {item.actionLabel}
        </Button>
      )}
    </div>
  );
}

type CategoryFilterProps = {
  categories: string[];
  selectedCategory: string | 'all';
  onSelectCategory: (category: string | 'all') => void;
  allLabel: string;
  categoryLabel: string;
  config: ReusableMobileCalendarConfig['category'];
};

function CategoryFilter({
  categories,
  selectedCategory,
  onSelectCategory,
  allLabel,
  categoryLabel,
  config,
}: CategoryFilterProps) {
  const renderCategoryButton = useCallback((category: string | 'all', label: string) => {
    const isSelected = selectedCategory === category;

    return (
      <button
        key={category}
        onClick={() => onSelectCategory(category)}
        className="flex items-center flex-shrink-0 transition-colors hover:bg-gray-50"
        style={{
          paddingLeft: config.padding.horizontal,
          paddingRight: config.padding.horizontal,
          paddingTop: config.padding.vertical,
          paddingBottom: config.padding.vertical,
          borderRadius: config.borderRadius,
          gap: 4,
        }}
      >
        <div
          className={isSelected ? 'bg-primary' : 'bg-gray-400'}
          style={{
            width: config.dotSize,
            height: config.dotSize,
            borderRadius: 999,
          }}
        />
        <span
          className={`uppercase ${isSelected ? 'text-gray-900 font-bold' : 'text-gray-500 font-medium'}`}
          style={{ fontSize: config.fontSize }}
        >
          {label}
        </span>
      </button>
    );
  }, [selectedCategory, onSelectCategory, config]);

  return (
    <div className="w-full overflow-x-auto scrollbar-hide">
      <div className="flex gap-2.5 pr-4 w-max">
        {renderCategoryButton('all', allLabel)}
        {categories.map((category) =>
          renderCategoryButton(category, `${category} ${categoryLabel}`)
        )}
      </div>
    </div>
  );
}

export type MobileCalendarProps = {
  type: CalendarType;
  calendar: MobileCalendarMeta;
  items: MobileCalendarItem[];
  defaultAvatarUrl: string;
  onPrevWeek?: () => void;
  onNextWeek?: () => void;
  enableCategoryFilter?: boolean;
  categoryAllLabel?: string;
  categoryLabel?: string;
  emptyMessage?: string;
  renderContent?: (items: MobileCalendarItem[]) => ReactNode;
};

export function MobileCalendar({
  type,
  calendar,
  items,
  defaultAvatarUrl,
  onPrevWeek,
  onNextWeek,
  enableCategoryFilter = false,
  categoryAllLabel = 'All',
  categoryLabel = 'Items',
  emptyMessage = 'No items for this day',
  renderContent,
}: MobileCalendarProps) {
  const locale = useLocale();
  const config = MOBILE_CALENDAR_CONFIGS[type];
  const [selectedDayIndex, setSelectedDayIndex] = useState(() => calendar.currentDayIndex ?? 0);
  const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all');

  const localizedWeekDays = useMemo(
    () => formatWeekDays(calendar.weekDays, locale),
    [calendar.weekDays, locale]
  );

  const localizedTitle = useMemo(
    () => formatCalendarTitle(calendar.title, locale),
    [calendar.title, locale]
  );

  useEffect(() => {
    setSelectedDayIndex(calendar.currentDayIndex ?? 0);
  }, [calendar.currentDayIndex, calendar.title]);

  const selectedDayItems = useMemo(
    () => items.filter((item) => item.dayIndex === selectedDayIndex),
    [items, selectedDayIndex]
  );

  const categories = useMemo(
    () => Array.from(new Set(selectedDayItems.map((item) => item.category).filter(Boolean))) as string[],
    [selectedDayItems]
  );

  useEffect(() => {
    if (selectedCategory !== 'all' && !categories.includes(selectedCategory)) {
      setSelectedCategory('all');
    }
  }, [categories, selectedCategory]);

  const filteredItems = useMemo(
    () =>
      selectedCategory === 'all'
        ? selectedDayItems
        : selectedDayItems.filter((item) => item.category === selectedCategory),
    [selectedCategory, selectedDayItems]
  );

  const defaultRenderContent = useCallback((itemsToRender: MobileCalendarItem[]) => (
    <div className="flex flex-col w-full" style={{ gap: 10 }}>
      {itemsToRender.length > 0 ? (
        itemsToRender.map((item) => (
          <MobileCalendarCard
            key={item.id}
            item={item}
            defaultAvatarUrl={defaultAvatarUrl}
            config={config.card}
          />
        ))
      ) : (
        <div 
          className="w-full border border-gray-200 bg-gray-50 flex items-center justify-center"
          style={{
            minHeight: config.empty.minHeight,
            borderRadius: config.empty.borderRadius,
            padding: config.empty.padding,
          }}
        >
          <p 
            className="text-gray-500 text-center"
            style={{ fontSize: config.empty.fontSize }}
          >
            {emptyMessage}
          </p>
        </div>
      )}
    </div>
  ), [defaultAvatarUrl, config, emptyMessage]);

  const finalRenderContent = renderContent ?? defaultRenderContent;

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex items-center justify-between w-full">
        <Button
          variant="ghost"
          size="icon"
          onClick={onPrevWeek}
          disabled={!onPrevWeek}
          style={{
            padding: config.navigation.buttonPadding,
            borderRadius: config.navigation.buttonBorderRadius,
          }}
        >
          <ChevronLeft style={{ width: config.navigation.iconSize, height: config.navigation.iconSize }} />
        </Button>

        <h2 
          className="font-bold text-gray-900 text-center"
          style={{ fontSize: config.navigation.titleFontSize }}
        >
          {localizedTitle}
        </h2>

        <Button
          variant="ghost"
          size="icon"
          onClick={onNextWeek}
          disabled={!onNextWeek}
          style={{
            padding: config.navigation.buttonPadding,
            borderRadius: config.navigation.buttonBorderRadius,
          }}
        >
          <ChevronRight style={{ width: config.navigation.iconSize, height: config.navigation.iconSize }} />
        </Button>
      </div>

      <div className="flex w-full justify-between items-center" style={{ flexWrap: 'nowrap' }}>
        {localizedWeekDays.map((day, index) => {
          const isActive = selectedDayIndex === index;
          const isToday = calendar.currentDayIndex === index;
          
          return (
            <WeekDayButton
              key={`${day.shortLabel}-${day.dateLabel}-${index}`}
              day={day.shortLabel}
              date={day.dateLabel}
              isActive={isActive}
              isToday={isToday}
              onPress={() => setSelectedDayIndex(index)}
              config={config.weekDay}
            />
          );
        })}
      </div>

      {enableCategoryFilter && categories.length > 0 && (
        <CategoryFilter
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          allLabel={categoryAllLabel}
          categoryLabel={categoryLabel}
          config={config.category}
        />
      )}

      {finalRenderContent(filteredItems)}
    </div>
  );
}
