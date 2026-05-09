'use client';

import { ExternalLink, Video } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type TutorAboutDto, type TutorResourceDto } from '@mezon-tutors/shared';

type TutorResourcesTabProps = {
  tutor: TutorAboutDto & {
    resources: TutorResourceDto[];
  };
};

export function TutorResourcesTab({ tutor }: TutorResourcesTabProps) {
  const t = useTranslations('Tutors.Detail');

  if (!tutor.resources.length) {
    return (
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-extrabold text-gray-900">
          {t('resourcesTitle')}
        </h2>
        <p className="text-gray-500">{t('resourcesEmpty')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-xl font-extrabold text-gray-900">
        {t('resourcesTitle')}
      </h2>

      {tutor.resources.map((resource) => (
        <div
          key={resource.id}
          className="bg-gray-50 border border-gray-200 rounded-xl p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-white border border-gray-200">
                <Video size={16} className="text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{resource.title}</h3>
                <p className="text-xs text-gray-500">{t('resourceTypeVideo')}</p>
              </div>
            </div>

            <button
              onClick={() => window.open(resource.url, '_blank', 'noopener,noreferrer')}
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors"
            >
              <ExternalLink size={14} />
              {t('openResource')}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
