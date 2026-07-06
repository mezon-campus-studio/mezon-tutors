import { ESubject } from '../enums/tutor-profile';
import { SubjectLabel } from './mapper';

export type TutorIntroYoutubeProfileMeta = {
  tutorId?: string;
  firstName: string;
  lastName: string;
  username?: string;
  headline?: string;
  subject?: string;
  introduce?: string;
};

const YOUTUBE_TITLE_MAX_LENGTH = 100;
const YOUTUBE_DESCRIPTION_MAX_LENGTH = 5000;
const TITLE_PREFIX = 'Mezonly | introduction video by ';

function truncateText(text: string, maxLength: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 1).trimEnd()}…`;
}

function buildDisplayName(profile: TutorIntroYoutubeProfileMeta): string {
  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim();
  return fullName || profile.username?.trim() || 'Tutor';
}

function resolveSubjectLabel(subject?: string): string {
  const trimmed = subject?.trim() ?? '';
  if (!trimmed) return '';

  if (Object.prototype.hasOwnProperty.call(SubjectLabel, trimmed)) {
    return SubjectLabel[trimmed as ESubject];
  }

  return trimmed;
}

export function buildTutorIntroYoutubeMetadata(
  profile: TutorIntroYoutubeProfileMeta,
  options?: { profileBaseUrl?: string },
): { title: string; description: string } {
  const displayName = buildDisplayName(profile);
  const subjectLabel = resolveSubjectLabel(profile.subject);
  const headline = profile.headline?.trim() ?? '';

  const title = truncateText(`${TITLE_PREFIX}${displayName}`, YOUTUBE_TITLE_MAX_LENGTH);

  const introLines: string[] = [];
  if (subjectLabel) {
    introLines.push(`Tutor teaching ${subjectLabel}`);
  } else {
    introLines.push('Tutor');
  }
  if (headline) {
    introLines.push(headline);
  }

  const descriptionBlocks: string[] = [];

  const profileBaseUrl = options?.profileBaseUrl?.replace(/\/$/, '').trim();
  if (profile.tutorId && profileBaseUrl) {
    descriptionBlocks.push(`${profileBaseUrl}/tutors/${profile.tutorId}`);
  }

  descriptionBlocks.push(introLines.join('\n'));
  descriptionBlocks.push('Published on Mezonly');

  const description = truncateText(
    descriptionBlocks.join('\n\n'),
    YOUTUBE_DESCRIPTION_MAX_LENGTH,
  );

  return { title, description };
}
