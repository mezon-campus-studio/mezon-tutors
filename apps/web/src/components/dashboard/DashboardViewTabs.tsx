'use client';

import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type DashboardViewTabsProps<T extends string> = {
  tabs: readonly T[];
  activeTab: T;
  onTabChange: (tab: T) => void;
  getLabel: (tab: T) => string;
  tabIcons: Partial<Record<string, LucideIcon>>;
  className?: string;
};

export default function DashboardViewTabs<T extends string>({
  tabs,
  activeTab,
  onTabChange,
  getLabel,
  tabIcons,
  className,
}: DashboardViewTabsProps<T>) {
  return (
    <div
      className={cn(
        'w-full overflow-x-auto scrollbar-hide',
        className,
      )}
    >
      <div
        className="flex w-full max-w-full items-center gap-1 rounded-full border border-violet-100 bg-white p-1 shadow-sm shadow-violet-100/40 sm:w-fit"
        role="tablist"
      >
        {tabs.map((tab) => {
          const Icon = tabIcons[tab] as LucideIcon | undefined;
          const isActive = activeTab === tab;

          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onTabChange(tab)}
              className={cn(
                'group relative inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold transition-all duration-300 sm:flex-none sm:px-4',
                isActive
                  ? 'bg-[linear-gradient(110deg,#faf5ff,#fdf2f8)] text-violet-700 ring-1 ring-violet-100'
                  : 'text-slate-600 hover:text-violet-700',
              )}
            >
              {Icon ? (
                <Icon
                  className={cn(
                    'size-4 shrink-0 transition-colors',
                    isActive ? 'text-violet-600' : 'text-slate-400',
                  )}
                />
              ) : null}
              <span className="whitespace-nowrap">{getLabel(tab)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
