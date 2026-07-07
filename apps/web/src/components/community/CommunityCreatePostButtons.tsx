'use client';

import { type CommunityPostType } from '@mezon-tutors/shared';
import { Dumbbell, HelpCircle, FileEdit } from 'lucide-react';
import { useTranslations } from 'next-intl';

const BUTTON_CONFIG: {
  type: CommunityPostType;
  icon: typeof FileEdit;
  bgClass: string;
  iconClass: string;
}[] = [
  {
    type: 'POST',
    icon: FileEdit,
    bgClass: 'bg-blue-50 text-blue-600',
    iconClass: 'text-blue-600',
  },
  {
    type: 'QUESTION',
    icon: HelpCircle,
    bgClass: 'bg-purple-50 text-purple-600',
    iconClass: 'text-purple-600',
  },
  {
    type: 'EXERCISE',
    icon: Dumbbell,
    bgClass: 'bg-emerald-50 text-emerald-600',
    iconClass: 'text-emerald-600',
  },
];

type CommunityCreatePostButtonsProps = {
  onSelect: (type: CommunityPostType) => void;
};

export function CommunityCreatePostButtons({ onSelect }: CommunityCreatePostButtonsProps) {
  const t = useTranslations('Community.feed');

  return (
    <div className="space-y-1">
      {BUTTON_CONFIG.map(({ type, icon: Icon, bgClass, iconClass }) => (
        <button
          key={type}
          type="button"
          onClick={() => onSelect(type)}
          className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-neutral-100"
        >
          <div className={`flex size-8 items-center justify-center rounded-lg ${bgClass}`}>
            <Icon className={`size-4 ${iconClass}`} />
          </div>
          <span className="text-sm font-medium text-neutral-900">{t(`tabs.${type === 'EXERCISE' ? 'exercise' : type.toLowerCase()}`)}</span>
        </button>
      ))}
    </div>
  );
}
