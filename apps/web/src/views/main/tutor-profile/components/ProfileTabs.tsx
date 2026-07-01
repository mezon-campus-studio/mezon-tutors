'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

export const PROFILE_TAB = {
  GENERAL: 1,
  TUTOR_INFO: 2,
  SCHEDULE: 3,
} as const;

export type ProfileTabNumber = (typeof PROFILE_TAB)[keyof typeof PROFILE_TAB];

type ProfileTabId = 'general' | 'tutorInfo' | 'schedule';

const TABS: { number: ProfileTabNumber; id: ProfileTabId }[] = [
  { number: PROFILE_TAB.GENERAL, id: 'general' },
  { number: PROFILE_TAB.TUTOR_INFO, id: 'tutorInfo' },
  { number: PROFILE_TAB.SCHEDULE, id: 'schedule' },
];

type ProfileTabsProps = {
  activeTab: ProfileTabNumber;
  onTabChange: (tab: ProfileTabNumber) => void;
  className?: string;
};

export default function ProfileTabs({ activeTab, onTabChange, className }: ProfileTabsProps) {
  const t = useTranslations('Dashboard.profile');

  return (
    <div className={cn('w-full max-w-full overflow-x-auto scrollbar-hide', className)}>
      <div
        className="flex w-full min-w-0 gap-1 rounded-2xl border border-violet-100 bg-white/80 p-1.5 shadow-sm shadow-violet-100/40 backdrop-blur"
        role="tablist"
      >
        {TABS.map(({ number: tabNumber, id }) => {
          const isActive = activeTab === tabNumber;

          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onTabChange(tabNumber)}
              className={cn(
                'min-h-11 min-w-0 flex-1 cursor-pointer whitespace-nowrap rounded-xl px-2 py-2 text-xs font-semibold transition-all sm:flex-none sm:px-4 sm:text-sm',
                isActive
                  ? 'bg-brand-gradient text-white shadow-sm shadow-violet-300/40'
                  : 'text-slate-600 hover:bg-violet-50 hover:text-violet-700',
              )}
            >
              {t(`tabs.${id}`)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
