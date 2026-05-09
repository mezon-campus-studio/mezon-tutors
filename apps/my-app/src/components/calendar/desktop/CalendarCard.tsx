'use client';

import { CALENDAR_THEME_CONFIG, DEFAULT_THEME_CONFIG } from '@mezon-tutors/shared';
import type { ReactNode } from 'react';
import { Calendar } from './Calendar';
import { buildDefaultRenderSlot } from './CalendarCardEmptySlots';
import { resolveCardPresetRender, type CalendarPresetData } from './CalendarCardPresets';
import type { BaseCalendarProps } from '../types';

type CalendarCardProps<TEvent> = BaseCalendarProps<TEvent> & {
  header?: ReactNode;
  footer?: ReactNode;
  presetData?: CalendarPresetData;
};

export function CalendarCard<TEvent = unknown>({
  header,
  footer,
  presetData,
  type,
  renderSlot,
  ...calendarProps
}: CalendarCardProps<TEvent>) {
  const themeConfig = CALENDAR_THEME_CONFIG[type] ?? DEFAULT_THEME_CONFIG;
  const { cardBorder = true, cardBorderRadius = 16, cardPadding = 16 } = themeConfig;

  const defaultRenderSlot = buildDefaultRenderSlot(type, themeConfig);
  const finalRenderSlot = renderSlot ?? defaultRenderSlot;

  const presetResult =
    !header && !footer && presetData
      ? resolveCardPresetRender(type, {
          data: presetData,
          isCompact: Boolean(calendarProps.isCompact),
        })
      : undefined;

  return (
    <div
      className={`
        w-full flex flex-col
        ${cardBorder ? 'border' : ''}
      `}
      style={{
        borderRadius: cardBorderRadius,
        padding: cardPadding,
        gap: 12,
        backgroundColor: 'var(--card)',
        borderColor: cardBorder ? `var(--calendar-${type}-grid-border)` : 'transparent',
      }}
    >
      {header ?? presetResult?.header}

      <Calendar
        {...calendarProps}
        type={type}
        renderSlot={finalRenderSlot}
      />

      {footer ?? presetResult?.footer}
    </div>
  );
}
