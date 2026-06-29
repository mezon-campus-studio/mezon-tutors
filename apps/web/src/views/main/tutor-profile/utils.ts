import {
  ECurrency,
  emptySlotsByDay,
  TUTOR_PROFILE_UPDATE_SECTION,
  type CountryEnum,
  type TutorAvailabilitySlotDto,
  type UpdateMyTutorProfileDto,
  type TimeSlot,
} from '@mezon-tutors/shared';
import { PROFILE_TAB, type ProfileTabNumber } from './components/ProfileTabs';

export type TutorLanguageRow = {
  languageCode: string;
  proficiency: string;
};

export type MyTutorProfileRecord = {
  id: string;
  timezone?: string | null;
  firstName: string;
  lastName: string;
  avatar: string;
  videoUrl: string;
  country: string;
  phone: string;
  email: string;
  subject: string;
  introduce: string;
  experience: string;
  headline: string;
  verificationStatus: string;
  activeStatus: boolean;
  totalLessonsTaught: number;
  totalStudents: number;
  ratingCount: number;
  ratingAverage: string | number;
  languages: TutorLanguageRow[];
  availability: Array<{ dayOfWeek: number; startTime: string; endTime: string }>;
  identityVerification?: { hasFile: boolean } | null;
  professionalDocuments?: Array<{
    type: string;
    name: string;
    hasFile: boolean;
    institution?: string | null;
    specialization?: string | null;
    yearOfComplete?: number | null;
  }>;
  trialLessonPrice?: {
    baseCurrency: ECurrency;
    usd: string | number;
    vnd: string | number;
    php: string | number;
  } | null;
};

export type TutorProfileFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  phone: string;
  subject: string;
  headline: string;
  introduce: string;
  videoUrl: string;
  hourlyRate: string;
  currency: ECurrency;
  languageEntries: Array<{ language: string; proficiency: string }>;
  slotsByDay: Record<string, TimeSlot[]>;
};

export function getPriceFromTrialLessonPrice(price: MyTutorProfileRecord['trialLessonPrice']): {
  amount: number;
  currency: ECurrency;
} {
  if (!price) {
    return { amount: 0, currency: ECurrency.VND };
  }
  const currency = Object.values(ECurrency).includes(price.baseCurrency as ECurrency)
    ? price.baseCurrency
    : ECurrency.VND;
  if (currency === ECurrency.USD) {
    return { amount: Number(price.usd), currency };
  }
  if (currency === ECurrency.PHP) {
    return { amount: Number(price.php), currency };
  }
  return { amount: Number(price.vnd), currency };
}

export function profileToFormValues(profile: MyTutorProfileRecord): TutorProfileFormValues {
  const { amount, currency } = getPriceFromTrialLessonPrice(profile.trialLessonPrice);
  return {
    firstName: profile.firstName,
    lastName: profile.lastName,
    email: profile.email,
    country: profile.country,
    phone: profile.phone,
    subject: profile.subject,
    headline: profile.headline,
    introduce: profile.introduce,
    videoUrl: profile.videoUrl ?? '',
    hourlyRate: amount > 0 ? String(amount) : '',
    currency,
    languageEntries:
      profile.languages.length > 0
        ? profile.languages.map((l) => ({
            language: l.languageCode,
            proficiency: l.proficiency,
          }))
        : [{ language: '', proficiency: '' }],
    slotsByDay: emptySlotsByDay(),
  };
}

function mapLanguageEntries(values: TutorProfileFormValues) {
  return values.languageEntries
    .filter((e) => e.language && e.proficiency)
    .map((e) => ({
      languageCode: e.language,
      proficiency: e.proficiency,
    }));
}

export function buildUpdateMyProfilePayload(
  tab: ProfileTabNumber,
  values: TutorProfileFormValues,
  prices: { usd: number; vnd: number; php: number },
  utcAvailability: TutorAvailabilitySlotDto[]
): UpdateMyTutorProfileDto {
  if (tab === PROFILE_TAB.GENERAL) {
    return {
      section: TUTOR_PROFILE_UPDATE_SECTION.GENERAL,
      general: {
        firstName: values.firstName,
        lastName: values.lastName,
        country: values.country as CountryEnum,
        phone: values.phone,
        subject: values.subject,
        languages: mapLanguageEntries(values),
      },
    };
  }

  if (tab === PROFILE_TAB.TUTOR_INFO) {
    return {
      section: TUTOR_PROFILE_UPDATE_SECTION.TUTOR_INFO,
      tutorInfo: {
        headline: values.headline,
        introduce: values.introduce,
        videoUrl: values.videoUrl,
      },
    };
  }

  return {
    section: TUTOR_PROFILE_UPDATE_SECTION.SCHEDULE,
    schedule: {
      currency: values.currency,
      prices,
      availability: utcAvailability,
    },
  };
}
