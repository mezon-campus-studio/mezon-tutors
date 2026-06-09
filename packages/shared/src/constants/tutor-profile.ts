/**
 * Tutor profile about-step constants.
 * English only for now / Chỉ hỗ trợ tiếng Anh hiện tại.
 * Có thể mở rộng đa ngôn ngữ sau.
 */

/** Countries (display names in English). */
export const ABOUT_COUNTRIES = [
  'Vietnam',
  'United States',
  'United Kingdom',
  'Australia',
  'Canada',
  'India',
  'Singapore',
  'Philippines',
  'Other',
] as const;

/** Subjects to teach. Default/focus: English only. Có thể thêm môn khác sau. */
export const ABOUT_SUBJECTS = [
  'English',
  'Math',
  'Science',
  'History',
  'Spanish',
  'French',
  'German',
  'Japanese',
  'Korean',
  'Vietnamese',
  'Other',
] as const;

/** Languages spoken (display names in English). */
export const ABOUT_LANGUAGES = [
  'English',
  'Vietnamese',
  'Chinese (Mandarin)',
  'Chinese (Cantonese)',
  'Spanish',
  'French',
  'German',
  'Japanese',
  'Korean',
  'Portuguese',
  'Italian',
  'Russian',
  'Arabic',
  'Hindi',
  'Thai',
  'Indonesian',
  'Dutch',
  'Polish',
  'Turkish',
  'Other',
] as const;

/** Parse stored languages string (comma-separated) to array. */
export function parseLanguagesString(value: string): string[] {
  if (!value || !value.trim()) return [];
  return value.split(',').map((s) => s.trim()).filter(Boolean);
}

/** Join languages array to stored string. */
export function joinLanguagesArray(languages: string[]): string {
  return languages.filter(Boolean).join(', ');
}

/** Parse stored proficiencies string (comma-separated) to array. */
export function parseProficienciesString(value: string): string[] {
  if (!value || !value.trim()) return [];
  return value.split(',').map((s) => s.trim()).filter(Boolean);
}

/** Join proficiencies array to stored string. */
export function joinProficienciesArray(proficiencies: string[]): string {
  return proficiencies.filter(Boolean).join(', ');
}

/** Day keys for availability (Mon..Sun), index 0 = Monday. */
export const DAY_KEYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

/** Get day key by index (0 = Mon, 6 = Sun). */
export function getDayKey(index: number): string {
  return DAY_KEYS[index] ?? 'Mon';
}

/** Language proficiency levels (English labels). */
export const ABOUT_PROFICIENCY_LEVELS = [
  'Native',
  'Near-Native',
  'Fluent',
  'Advanced',
  'Upper-Intermediate',
  'Intermediate',
  'Elementary',
  'Basic',
  'Beginner',
] as const;

export const TUTOR_DETAIL_MOBILE_CONFIG = {
  videoHeight: 200,
  typography: {
    aboutTitle: 18,
    languageTitle: 16,
    paragraph: 14,
    chip: 13,
  },
  lineHeight: {
    aboutTitle: 24,
    languageTitle: 22,
    paragraph: 20,
  },
  spacing: '$3',
  gap: '$1.5',
  padding: '$2',
  chip: {
    paddingHorizontal: '$2',
    paddingVertical: '$1',
  },
} as const;

export const TUTOR_DETAIL_LAYOUT_CONFIG = {
  maxWidth: 1320,
  sidebarWidth: 320,
  bottomPadding: 24,
} as const;

export const VIDEO_PREVIEW_WIDTH = 420;

export const YEAR_PICKER_CONFIG = {
  minYear: 1950,
  maxYear: new Date().getFullYear(),
} as const;

export const TEACHING_CERTIFICATES = [
  'IELTS',
  'TOEIC',
  'TOEFL',
  'TEFL',
  'TESOL',
  'CELTA',
] as const;

export const BECOME_TUTOR_STEPS = {
  ABOUT: 1,
  PHOTO: 2,
  CERTIFICATION: 3,
  VIDEO: 4,
  AVAILABILITY: 5,
  FINAL: 6,
} as const;

export function calculateStepProgress(currentStep: number): number {
  return (currentStep - 1) * 20;
}

export function getStepRoute(step: number): string {
  switch (step) {
    case BECOME_TUTOR_STEPS.ABOUT: return '/become-tutor/about';
    case BECOME_TUTOR_STEPS.PHOTO: return '/become-tutor/photo';
    case BECOME_TUTOR_STEPS.CERTIFICATION: return '/become-tutor/certification';
    case BECOME_TUTOR_STEPS.VIDEO: return '/become-tutor/video';
    case BECOME_TUTOR_STEPS.AVAILABILITY: return '/become-tutor/availability';
    default: return '/become-tutor/about';
  }
}

export const ACCEPT_IMAGE_TYPES = 'image/jpeg,image/png,image/jpg';

export const ACCEPT_FILE_TYPES = '.pdf,.jpg,.jpeg,.png';

export const ACCEPT_CV_TYPES = '.pdf,.jpg,.jpeg,.png,.docx';

export function parseYouTubeId(url: string): string | null {
  const trimmed = url.trim();
  const match = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/.exec(trimmed);
  return match ? match[1] : null;
}

export function parseVimeoId(url: string): string | null {
  const trimmed = url.trim();
  const match = /vimeo\.com\/(?:video\/)?(\d+)/.exec(trimmed);
  return match ? match[1] : null;
}

export const PROFESSIONAL_DOCUMENT_TYPE = {
  DEGREE: 'DEGREE',
  CERTIFICATE: 'CERTIFICATE',
  CV: 'CV',
  OTHER: 'OTHER',
} as const;
