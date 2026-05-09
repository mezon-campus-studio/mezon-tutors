'use client';

import type { CalendarThemeConfig } from '@mezon-tutors/shared';
import type { ReactNode } from 'react';

function DefaultEmptySlot({ text }: { text?: string }): ReactNode {
  if (!text) return null;

  return (
    <div className="w-full h-full flex justify-center items-center opacity-50">
      <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--calendar-mySchedule-day-label)' }}>
        {text}
      </span>
    </div>
  );
}

function OutlinedEmptySlot({
  type,
  text,
  maxWidth,
  minHeight,
  borderRadius = 12,
  borderStyle = 'dashed',
}: {
  type: string;
  text?: string;
  maxWidth?: number;
  minHeight?: number;
  borderRadius?: number;
  borderStyle?: 'solid' | 'dashed';
}): ReactNode {
  return (
    <div
      className="w-full h-full flex justify-center items-center self-center"
      style={{
        maxWidth,
        minHeight,
        borderRadius,
        backgroundColor: `var(--calendar-${type}-slot-empty-bg)`,
        borderWidth: 1,
        borderStyle,
        borderColor: `var(--calendar-${type}-slot-empty-border)`,
      }}
    >
      {text ? (
        <span
          className="text-[10px] font-bold tracking-wider"
          style={{ color: `var(--calendar-${type}-slot-empty-text)` }}
        >
          {text}
        </span>
      ) : null}
    </div>
  );
}

export function buildDefaultRenderSlot(type: string, themeConfig: CalendarThemeConfig) {
  if (!themeConfig.showEmptySlots) return undefined;

  if (themeConfig.emptySlotStyle === 'outlinedCard') {
    return () => (
      <OutlinedEmptySlot
        type={type}
        text={themeConfig.emptySlotText}
        maxWidth={themeConfig.emptySlotMaxWidth}
        minHeight={themeConfig.emptySlotMinHeight}
        borderRadius={themeConfig.emptySlotBorderRadius}
        borderStyle={themeConfig.emptySlotBorderStyle}
      />
    );
  }

  return () => <DefaultEmptySlot text={themeConfig.emptySlotText} />;
}
