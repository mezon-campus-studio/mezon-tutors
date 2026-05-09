'use client';

import { useTranslations } from 'next-intl';

type MyLessonsTab = 'lessons' | 'calendar' | 'tutors';

type MyLessonsHeaderProps = {
  activeTab: MyLessonsTab;
  onTabChange: (tab: MyLessonsTab) => void;
};

const tabs: MyLessonsTab[] = ['lessons', 'calendar', 'tutors'];

export default function MyLessonsHeader({ activeTab, onTabChange }: MyLessonsHeaderProps) {
  const t = useTranslations('MyLessons');

  return (
    <div className="flex items-center gap-6 border-b border-gray-200 pb-4">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          className={`
            text-base font-semibold pb-2 border-b-2 transition-colors
            ${
              activeTab === tab
                ? 'text-primary border-primary'
                : 'text-gray-500 border-transparent hover:text-gray-700'
            }
          `}
        >
          {t(`tabs.${tab}`)}
        </button>
      ))}
    </div>
  );
}
