'use client';

import Image from 'next/image';
import { Star, Globe, GraduationCap } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { TutorAboutDto, TUTOR_DETAIL_TAB_KEYS, type TutorDetailTabKey } from '@mezon-tutors/shared';

type TutorDetailHeaderProps = {
  tutor: TutorAboutDto;
  activeTab: TutorDetailTabKey;
  onTabChange: (tab: TutorDetailTabKey) => void;
};

export function TutorDetailHeader({ tutor, activeTab, onTabChange }: TutorDetailHeaderProps) {
  const t = useTranslations('Tutors.Detail');

  return (
    <div className="bg-white border border-gray-200 rounded-t-2xl overflow-hidden">
      <div className="flex flex-col sm:flex-row gap-4 p-6">
        <Image
          src={tutor.avatar}
          alt={`${tutor.firstName} ${tutor.lastName}`}
          width={72}
          height={72}
          priority
          className="rounded-xl border border-gray-200 object-cover"
        />

        <div className="flex-1 flex flex-col gap-2 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-extrabold text-gray-900">
              {tutor.firstName} {tutor.lastName}
            </h1>
            {tutor.isProfessional && (
              <span className="px-2.5 py-1 bg-primary/10 border border-primary/20 rounded-full text-xs font-semibold text-primary">
                {t('professional')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-gray-600">
            <GraduationCap size={14} />
            <span className="text-sm">
              {tutor.subject} • {tutor.headline || t('defaultHeadline')}
            </span>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5 text-gray-600">
              <Globe size={14} />
              <span className="text-sm">{tutor.country}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Star size={14} className="fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-bold text-gray-900">
                {tutor.ratingAverage.toFixed(2)}
              </span>
              <span className="text-sm text-gray-600">
                {t('reviewsCount', { count: tutor.ratingCount })}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 px-6 flex gap-4 overflow-x-auto scrollbar-hide">
        {TUTOR_DETAIL_TAB_KEYS.map((tab) => {
          const isActive = tab === activeTab;
          return (
            <button
              key={tab}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tab-panel-${tab}`}
              onClick={() => onTabChange(tab)}
              className={`relative whitespace-nowrap text-sm font-medium transition-colors py-3 ${
                isActive ? 'text-primary font-bold' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t(`tabs.${tab}`)}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
