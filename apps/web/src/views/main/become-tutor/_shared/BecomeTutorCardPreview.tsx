'use client';

import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import {
  DEFAULT_AVATAR_URL,
  ECurrency,
  type VerifiedTutorProfileDto,
} from '@mezon-tutors/shared';
import TutorCard from '@/views/main/tutors/components/TutorCard';
import { cn } from '@/lib/utils';
import { userAtom } from '@/store';
import { buildLanguageEntries } from '../about-page';
import { useBecomeTutorPreviewDraft } from './useBecomeTutorLivePreview';

function useBecomeTutorPreviewTutor(
  draft: ReturnType<typeof useBecomeTutorPreviewDraft>,
  placeholders: { name: string; intro: string },
): VerifiedTutorProfileDto {
  const user = useAtomValue(userAtom);
  const { about, photo, certification, availability } = draft;

  return useMemo(() => {
    const languages = buildLanguageEntries(about.languages, about.proficiencies)
      .filter((entry) => entry.language.trim())
      .map((entry) => ({
        languageCode: entry.language,
        proficiency: entry.proficiency,
      }));

    const rate = Number.parseFloat(availability.hourlyRate) || 0;
    const baseCurrency = availability.currency || ECurrency.VND;
    const avatar =
      user?.avatar ||
      photo.photo?.uploadedUrl ||
      photo.photo?.dataUrl ||
      DEFAULT_AVATAR_URL;

    const firstName = about.firstName.trim();
    const lastName = about.lastName.trim();
    const displayName = `${firstName} ${lastName}`.trim() || placeholders.name;

    const [previewFirstName, ...previewLastParts] = displayName.split(' ');
    const previewLastName = previewLastParts.join(' ');

    const isProfessional = Boolean(
      certification.teachingCertificate?.file?.uploadedUrl ||
        certification.teachingCertificate?.file?.publicId,
    );

    return {
      id: 'become-tutor-preview',
      userId: 'become-tutor-preview',
      mezonUserId: '',
      firstName: previewFirstName,
      lastName: previewLastName,
      avatar,
      videoUrl: '',
      country: about.country,
      subject: about.subject,
      introduce: photo.introduce?.trim() || placeholders.intro,
      experience: '',
      motivate: photo.motivate || '',
      headline: photo.headline || '',
      prices: {
        baseCurrency,
        usd: baseCurrency === ECurrency.USD ? rate : 0,
        vnd: baseCurrency === ECurrency.VND ? rate : 0,
        php: baseCurrency === ECurrency.PHP ? rate : 0,
      },
      isProfessional,
      activeStatus: true,
      totalLessonsTaught: 0,
      totalStudents: 0,
      ratingCount: 0,
      ratingAverage: 0,
      timezone: '',
      languages,
    };
  }, [about, availability, certification, photo, placeholders.intro, placeholders.name, user?.avatar]);
}

export function BecomeTutorCardPreview() {
  const t = useTranslations('BecomeTutor.shell.preview');
  const draft = useBecomeTutorPreviewDraft();
  const hasIntro = Boolean(draft.photo.introduce?.trim());
  const tutor = useBecomeTutorPreviewTutor(draft, {
    name: t('namePlaceholder'),
    intro: t('introPlaceholder'),
  });

  return (
    <div
      className={cn(
        'pointer-events-none select-none',
        !hasIntro && '[&_p.line-clamp-2]:italic [&_p.line-clamp-2]:text-slate-400',
      )}
    >
      <TutorCard tutor={tutor} preview />
    </div>
  );
}
