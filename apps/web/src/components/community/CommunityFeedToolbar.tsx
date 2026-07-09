'use client';

import { type CommunityPostType } from '@mezon-tutors/shared';
import { PenLine, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

export type CommunityFeedTab = 'for_you' | 'following' | 'post' | 'exercise' | 'question';

const TABS: Array<{
  id: CommunityFeedTab;
  type?: CommunityPostType;
  disabled?: boolean;
}> = [
  { id: 'following' },
  { id: 'for_you' },
  { id: 'post', type: 'POST' },
  { id: 'exercise', type: 'EXERCISE' },
  { id: 'question', type: 'QUESTION' },
];

type CommunityFeedToolbarProps = {
  activeTab: CommunityFeedTab;
  onTabChange: (tab: CommunityFeedTab, type?: CommunityPostType) => void;
  onSearchOpen: () => void;
  onCreateClick?: () => void;
};

export function getActiveTabFromParams(
  type: CommunityPostType | null,
): CommunityFeedTab {
  if (type === 'POST') return 'post';
  if (type === 'EXERCISE') return 'exercise';
  if (type === 'QUESTION') return 'question';
  return 'for_you';
}

export function CommunityFeedToolbar({
  activeTab,
  onTabChange,
  onSearchOpen,
  onCreateClick,
}: CommunityFeedToolbarProps) {
  const t = useTranslations('Community.feed');

  return (
    <div className="border-b border-neutral-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col gap-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <nav className="-mb-px flex items-center gap-6">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                disabled={tab.disabled}
                onClick={() => {
                  if (tab.disabled) return;
                  onTabChange(tab.id, tab.type);
                }}
                className={cn(
                  'relative cursor-pointer shrink-0 pb-3 text-sm transition-colors',
                  tab.disabled && 'cursor-not-allowed opacity-40',
                  isActive
                    ? 'font-semibold text-neutral-900'
                    : 'font-medium text-neutral-400 hover:text-neutral-600',
                )}
              >
                {t(`tabs.${tab.id}`)}
                {isActive ? (
                  <span
                    className="absolute inset-x-0 -bottom-px h-1 rounded-full bg-brand-gradient"
                    aria-hidden
                  />
                ) : null}
              </button>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          {onCreateClick ? (
            <button
              type="button"
              onClick={onCreateClick}
              className="inline-flex size-9 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800"
              aria-label={t('create')}
            >
              <PenLine className="size-[18px] stroke-[1.75]" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={onSearchOpen}
            className="relative cursor-pointer"
          >
            <div className="h-9 w-full min-w-[180px] rounded-full border border-primary bg-white pl-9 pr-3 text-sm text-neutral-400 sm:w-52 flex items-center">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary shrink-0" />
              <span className="truncate">{t('searchByKeyword')}</span>
            </div>
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
