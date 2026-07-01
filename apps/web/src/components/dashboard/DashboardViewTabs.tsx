'use client';

import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';

type IndicatorStyle = {
  left: number;
  width: number;
};

type DashboardViewTabsProps<T extends string> = {
  tabs: readonly T[];
  activeTab: T;
  onTabChange: (tab: T) => void;
  getLabel: (tab: T) => string;
  tabIcons: Partial<Record<string, LucideIcon>>;
  className?: string;
};

const TAB_INDICATOR_CLASS =
  'bg-brand-gradient shadow-sm shadow-violet-300/40';

export default function DashboardViewTabs<T extends string>({
  tabs,
  activeTab,
  onTabChange,
  getLabel,
  tabIcons,
  className,
}: DashboardViewTabsProps<T>) {
  const tablistRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState<IndicatorStyle | null>(null);

  const updateIndicator = useCallback(() => {
    const listEl = tablistRef.current;
    if (!listEl) return;

    const activeEl = listEl.querySelector<HTMLElement>(`[data-tab="${activeTab}"]`);
    if (!activeEl) return;

    const listRect = listEl.getBoundingClientRect();
    const tabRect = activeEl.getBoundingClientRect();

    setIndicator({
      left: tabRect.left - listRect.left,
      width: tabRect.width,
    });
  }, [activeTab]);

  useLayoutEffect(() => {
    const listEl = tablistRef.current;
    if (!listEl) return;

    updateIndicator();

    const resizeObserver = new ResizeObserver(updateIndicator);
    resizeObserver.observe(listEl);

    for (const tab of tabs) {
      const tabEl = listEl.querySelector(`[data-tab="${tab}"]`);
      if (tabEl) resizeObserver.observe(tabEl);
    }

    return () => resizeObserver.disconnect();
  }, [tabs, updateIndicator]);

  return (
    <div className={cn('w-full overflow-x-auto scrollbar-hide', className)}>
      <div
        ref={tablistRef}
        className="relative flex w-full max-w-full items-center gap-1 rounded-full border border-violet-100 bg-white p-1 shadow-sm shadow-violet-100/40 sm:w-fit"
        role="tablist"
      >
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-y-1 z-0 rounded-full',
            TAB_INDICATOR_CLASS,
            indicator ? 'opacity-100' : 'opacity-0',
            'transition-[left,width,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
          )}
          style={
            indicator
              ? { left: indicator.left, width: indicator.width }
              : undefined
          }
        />

        {tabs.map((tab) => {
          const Icon = tabIcons[tab] as LucideIcon | undefined;
          const isActive = activeTab === tab;

          return (
            <Button
              key={tab}
              type="button"
              role="tab"
              data-tab={tab}
              aria-selected={isActive}
              onClick={() => onTabChange(tab)}
              variant="ghost"
              className={cn(
                'relative z-10 min-h-11 flex-1 gap-1.5 rounded-full border-transparent bg-transparent px-3 py-2 text-sm font-semibold transition-colors duration-300 ease-out active:translate-y-0 motion-reduce:transition-none sm:flex-none sm:px-4',
                isActive
                  ? 'text-white hover:bg-transparent hover:text-white'
                  : 'text-slate-600 hover:bg-violet-50 hover:text-violet-700',
              )}
            >
              {Icon ? (
                <Icon
                  className={cn(
                    'size-4 shrink-0 transition-colors duration-300 ease-out motion-reduce:transition-none',
                    isActive ? 'text-white' : 'text-slate-400',
                  )}
                />
              ) : null}
              <span className="whitespace-nowrap">{getLabel(tab)}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
