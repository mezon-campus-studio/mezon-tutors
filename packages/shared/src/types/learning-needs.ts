export const LEARNING_GOALS = [
  'CAREER_BUSINESS',
  'EXAMS_CERTIFICATIONS',
  'TRAVEL',
  'PERSONAL_DEVELOPMENT',
] as const;

export const LEARNING_USAGE_SITUATIONS = [
  'MEETINGS',
  'PRESENTATIONS',
  'EVERYDAY_CONVERSATION',
  'TEAMWORK',
  'NEGOTIATIONS',
  'TEAM_MANAGEMENT',
  'CLIENT_COMMUNICATION',
  'INTERVIEWS',
] as const;

export const LEARNING_FOCUS_AREAS = [
  'FLUENCY',
  'CONFIDENCE',
  'ACCURACY',
  'VOCABULARY',
  'PRONUNCIATION_INTONATION',
  'LISTENING',
  'READING',
  'WRITING',
] as const;

export const LEARNING_CURRENT_LEVELS = [
  'JUST_STARTING',
  'KNOW_THE_BASICS',
  'CONVERSATIONAL',
  'FLUENT',
] as const;

export const LEARNING_WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;

export const LEARNING_TIME_WINDOWS = [
  'H06_09',
  'H09_12',
  'H12_15',
  'H15_18',
  'H18_21',
  'H21_00',
  'H00_03',
  'H03_06',
] as const;

export const LEARNING_INTERESTS = [
  'READING',
  'MOVIES',
  'ART',
  'TECHNOLOGY',
  'GAMING',
  'PETS',
  'TRAVEL',
  'SPORTS',
  'FOOD',
  'HISTORY',
  'FITNESS',
  'FASHION',
  'SCIENCE',
  'LANGUAGES',
  'FINANCE',
  'POLITICS',
  'CULTURE',
  'OUTDOORS',
] as const;

export const LEARNING_LANGUAGES = [
  'English',
  'Vietnamese',
  'Chinese',
  'Japanese',
  'Korean',
  'Spanish',
  'French',
  'German',
  'Portuguese',
  'Arabic',
  'Hindi',
  'Russian',
  'Thai',
  'Indonesian',
  'Tagalog',
  'Other',
] as const;

const LANGUAGE_SUBJECT_PATTERN =
  /\b(language|english|vietnamese|chinese|mandarin|cantonese|japanese|korean|spanish|french|german|portuguese|arabic|hindi|russian|thai|indonesian|tagalog|tieng anh|tieng viet|tieng trung|tieng nhat|tieng han|tieng phap|tieng duc|tieng tay ban nha)\b/;

function normalizeLearningSubject(subject: string): string {
  return subject.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/đ/g, 'd').trim();
}

export function isLanguageLearningSubject(subject: string): boolean {
  const normalized = normalizeLearningSubject(subject);
  return LANGUAGE_SUBJECT_PATTERN.test(normalized);
}

const STEM_SUBJECT_PATTERN =
  /\b(math|mathematics|algebra|geometry|calculus|statistics|physics|chemistry|biology|science|stem|coding|programming|computer science|data science|engineering|toan|vat ly|hoa hoc|sinh hoc|khoa hoc|lap trinh|cong nghe thong tin)\b/;
const CREATIVE_SUBJECT_PATTERN =
  /\b(art|drawing|painting|design|music|piano|guitar|violin|singing|dance|photography|film|creative writing|my thuat|ve|thiet ke|am nhac|dan|hat|nhay|nhiep anh)\b/;

export type LearningNeedsSubjectCategory = 'language' | 'stem' | 'creative' | 'general';

export function getLearningNeedsSubjectCategory(subject: string): LearningNeedsSubjectCategory {
  const normalized = normalizeLearningSubject(subject);
  if (LANGUAGE_SUBJECT_PATTERN.test(normalized)) return 'language';
  if (STEM_SUBJECT_PATTERN.test(normalized)) return 'stem';
  if (CREATIVE_SUBJECT_PATTERN.test(normalized)) return 'creative';
  return 'general';
}

export type LearningGoal = (typeof LEARNING_GOALS)[number];
export type LearningUsageSituation = (typeof LEARNING_USAGE_SITUATIONS)[number];
export type LearningFocusArea = (typeof LEARNING_FOCUS_AREAS)[number];
export type LearningCurrentLevel = (typeof LEARNING_CURRENT_LEVELS)[number];
export type LearningWeekday = (typeof LEARNING_WEEKDAYS)[number];
export type LearningTimeWindow = (typeof LEARNING_TIME_WINDOWS)[number];
export type LearningInterest = (typeof LEARNING_INTERESTS)[number];

export type LearningNeedsAnswersV1 = {
  schemaVersion: 1;
  learningGoal: LearningGoal | null;
  usageSituations: LearningUsageSituation[];
  focusAreas: LearningFocusArea[];
  currentLevel: LearningCurrentLevel | null;
  workContext: string | null;
  industryKnowledgeRequired: boolean | null;
  industryContext: string | null;
  lessonsPerMonth: number | null;
  preferredWeekdays: LearningWeekday[];
  preferredTimeWindows: LearningTimeWindow[];
  timezone: string | null;
  nativeLanguage: string | null;
  otherLanguages: string[];
  interests: LearningInterest[];
};

export type LearningNeedsContextDto = {
  id: string;
  bookingId: string;
  subject: string;
  tutor: {
    id: string;
    displayName: string;
    avatarUrl: string;
  };
};

export type LearningNeedsSharedSnapshotDto = {
  revision: number;
  answers: LearningNeedsAnswersV1;
  sharedAt: string;
  updatedAt: string;
  shortSummary: string;
};

export type LearningNeedsSyncStatus = 'NOT_REQUIRED' | 'PENDING' | 'SYNCED' | 'FAILED';

export type LearningNeedsSyncDto = {
  status: LearningNeedsSyncStatus;
  attempts: number;
  lastAttemptAt: string | null;
  lastError: 'MEZON_SYNC_FAILED' | null;
};

export type LearningNeedsBookingDto = {
  context: LearningNeedsContextDto;
  draft: {
    revision: number;
    answers: LearningNeedsAnswersV1;
    updatedAt: string;
  } | null;
  prefill: LearningNeedsAnswersV1 | null;
  shared: LearningNeedsSharedSnapshotDto | null;
  sync: LearningNeedsSyncDto;
  canEdit: boolean;
  channelId: string | null;
  chatPeer: {
    userId: string;
    mezonUserId: string;
  };
};

export type CurrentLearningNeedsPinDto = {
  state: 'SHARED' | 'NOT_SHARED' | 'NO_ELIGIBLE_CONTEXT';
  canEdit: boolean;
  context: LearningNeedsContextDto | null;
  shared: LearningNeedsSharedSnapshotDto | null;
};

export type SaveLearningNeedsDraftRequest = {
  answers: LearningNeedsAnswersV1;
  expectedDraftRevision?: number;
};

export type ShareLearningNeedsRequest = {
  expectedDraftRevision: number;
};
