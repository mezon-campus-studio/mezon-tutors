'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import type { CalendarType } from '../types';

export type CalendarLegendItem = {
  key: string;
  label: string;
  color: string;
};

export type CalendarPresetData = {
  title?: string;
  subtitle?: string;
  weekLabel?: string;
  monthLabel?: string;
  showMonthNav?: boolean;
  onPrevWeek?: () => void;
  onNextWeek?: () => void;
  legendItems?: CalendarLegendItem[];
  companyLabel?: string;
  primaryDurationLabel?: string;
  secondaryDurationLabel?: string;
  showTodayButton?: boolean;
  todayButtonDisabled?: boolean;
  onGoToToday?: () => void;
};

export type CalendarCardPresetRenderContext = {
  data: CalendarPresetData;
  isCompact: boolean;
};

export type CalendarCardPresetRenderResult = {
  header?: ReactNode;
  footer?: ReactNode;
};

function MyLessonsPresetHeader({
  title,
  weekLabel,
  showMonthNav = true,
  isCompact,
  onPrevWeek,
  onNextWeek,
  showTodayButton,
  todayButtonDisabled,
  onGoToToday,
}: {
  title: string;
  weekLabel: string;
  monthLabel: string;
  showMonthNav?: boolean;
  isCompact: boolean;
  onPrevWeek?: () => void;
  onNextWeek?: () => void;
  showTodayButton?: boolean;
  todayButtonDisabled?: boolean;
  onGoToToday?: () => void;
}) {
  const t = useTranslations('MyLessons');
  
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1 pt-2 pb-4">
      <div className="flex items-center gap-3">
        <h2
          className="font-extrabold tracking-tight"
          style={{
            background:
              'linear-gradient(110deg,#7c3aed 0%,#a855f7 50%,#ec4899 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontSize: isCompact ? 24 : 30,
            lineHeight: isCompact ? '28px' : '36px',
          }}
        >
          {title}
        </h2>

        {showMonthNav && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Previous"
              className="flex size-8 cursor-pointer items-center justify-center rounded-full border border-violet-200 bg-white text-violet-700 transition hover:border-violet-300 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={onPrevWeek}
              disabled={!onPrevWeek}
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              aria-label="Next"
              className="flex size-8 cursor-pointer items-center justify-center rounded-full border border-violet-200 bg-white text-violet-700 transition hover:border-violet-300 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={onNextWeek}
              disabled={!onNextWeek}
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {showTodayButton && (
          <button
            type="button"
            className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              todayButtonDisabled
                ? 'cursor-not-allowed border-slate-200 text-slate-400'
                : 'cursor-pointer border-violet-200 text-violet-700 hover:border-violet-300 hover:bg-violet-50'
            }`}
            onClick={todayButtonDisabled ? undefined : onGoToToday}
            disabled={todayButtonDisabled}
          >
            {t('calendar.today')}
          </button>
        )}

        <div className="rounded-full bg-[linear-gradient(110deg,#7c3aed_0%,#9333ea_50%,#db2777_100%)] px-3.5 py-1.5 shadow-sm shadow-violet-300/40">
          <span className="text-xs font-bold text-white">{weekLabel}</span>
        </div>
      </div>
    </div>
  );
}

function MyLessonsPresetFooter({
  legendItems,
  companyLabel,
}: { legendItems: CalendarLegendItem[]; companyLabel?: string }) {
  return (
    <div className="pt-2 flex justify-between items-center flex-wrap gap-3 px-1">
      <div className="flex gap-3 flex-wrap">
        {legendItems.map((item) => (
          <div key={item.key} className="pb-2 flex items-center gap-2">
            <div
              className="w-[9px] h-[9px] rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs" style={{ color: 'var(--foreground)' }}>
              {item.label}
            </span>
          </div>
        ))}
      </div>

      {companyLabel ? (
        <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
          {companyLabel}
        </span>
      ) : null}
    </div>
  );
}

function MySchedulePresetHeader({
  title,
  weekLabel,
  monthLabel,
}: {
  title: string;
  weekLabel: string;
  monthLabel: string;
}) {
  return (
    <div className="flex justify-between items-center px-2">
      <h3 className="text-base font-bold" style={{ color: 'var(--foreground)' }}>
        {title}
      </h3>
      <div className="flex gap-2">
        <button
          type="button"
          className="px-3 py-1.5 text-sm border rounded"
          style={{
            borderColor: 'var(--border)',
            color: 'var(--foreground)',
          }}
        >
          {weekLabel}
        </button>
        <button
          type="button"
          className="px-3 py-1.5 text-sm border rounded"
          style={{
            borderColor: 'var(--border)',
            color: 'var(--foreground)',
          }}
        >
          {monthLabel}
        </button>
      </div>
    </div>
  );
}

function MySchedulePresetFooter({ legendItems }: { legendItems: CalendarLegendItem[] }) {
  return (
    <div className="mt-3 flex gap-3 flex-wrap px-1">
      {legendItems.map((item) => (
        <div key={item.key} className="flex items-center gap-2">
          <div
            className="w-[9px] h-[9px] rounded-full"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-xs" style={{ color: 'var(--foreground)' }}>
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

const CALENDAR_CARD_PRESET_RENDERERS: Partial<
  Record<CalendarType, (context: CalendarCardPresetRenderContext) => CalendarCardPresetRenderResult>
> = {
  myLessons: ({ data, isCompact }) => ({
    header: data.title ? (
      <MyLessonsPresetHeader
        title={data.title}
        weekLabel={data.weekLabel ?? 'Week'}
        monthLabel={data.monthLabel ?? 'Month'}
        showMonthNav={data.showMonthNav}
        isCompact={isCompact}
        onPrevWeek={data.onPrevWeek}
        onNextWeek={data.onNextWeek}
        showTodayButton={data.showTodayButton}
        todayButtonDisabled={data.todayButtonDisabled}
        onGoToToday={data.onGoToToday}
      />
    ) : undefined,
    footer: (
      <MyLessonsPresetFooter
        legendItems={data.legendItems ?? []}
        companyLabel={data.companyLabel}
      />
    ),
  }),
  mySchedule: ({ data }) => ({
    header: data.title ? (
      <MySchedulePresetHeader
        title={data.title}
        weekLabel={data.weekLabel ?? 'Week'}
        monthLabel={data.monthLabel ?? 'Month'}
      />
    ) : undefined,
    footer: data.legendItems?.length ? (
      <MySchedulePresetFooter legendItems={data.legendItems} />
    ) : undefined,
  }),
};

export function resolveCardPresetRender(
  calendarType: CalendarType,
  context: CalendarCardPresetRenderContext
) {
  const renderer = CALENDAR_CARD_PRESET_RENDERERS[calendarType];
  return renderer ? renderer(context) : undefined;
}
