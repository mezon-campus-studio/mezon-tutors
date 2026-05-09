'use client';

import { useTranslations } from 'next-intl';
import { type TutorAboutDto } from '@mezon-tutors/shared';
import VideoPreview from '../../components/VideoPreview';

type TutorAboutTabProps = {
  tutor: TutorAboutDto;
};

export function TutorAboutTab({ tutor }: TutorAboutTabProps) {
  const t = useTranslations('Tutors.Detail');

  return (
    <div className="flex flex-col gap-6">
      <VideoPreview 
        videoUrl={tutor.videoUrl} 
        height={330} 
        title={t('videoIntroTitle')} 
      />

      <div className="flex flex-col gap-3">
        <h2 className="text-xl font-extrabold text-gray-900">
          {t('aboutTitle')}
        </h2>
        
        <p className="text-base text-gray-600 leading-relaxed">
          {tutor.introduce || t('emptySection')}
        </p>
      </div>

      {tutor.experience ? (
        <div className="flex flex-col gap-3">
          <h2 className="text-xl font-extrabold text-gray-900">
            {t('experienceTitle')}
          </h2>
          
          <p className="text-base text-gray-600 leading-relaxed">
            {tutor.experience}
          </p>
        </div>
      ) : null}

      {tutor.motivate ? (
        <div className="flex flex-col gap-3">
          <h2 className="text-xl font-extrabold text-gray-900">
            {t('motivationTitle')}
          </h2>
          
          <p className="text-base text-gray-600 leading-relaxed">
            {tutor.motivate}
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-extrabold text-gray-900">
          {t('languagesTitle')}
        </h2>
        
        <div className="flex flex-wrap gap-2">
          {tutor.languages.map((language) => (
            <span
              key={`${language.languageCode}-${language.proficiency}`}
              className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-sm text-gray-900"
            >
              {language.languageCode.toUpperCase()}{' '}
              <span className="text-primary font-semibold">
                {language.proficiency}
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
