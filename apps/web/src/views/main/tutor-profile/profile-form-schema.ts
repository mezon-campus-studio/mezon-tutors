import {
  ECountry,
  ECurrency,
  ELanguage,
  EProficiencyLevel,
  ESubject,
  formatToCurrency,
  HOURLY_RATE_REGEX,
  MIN_PRICE,
  parseYouTubeId,
  validateWeeklySlots,
  VIETNAM_PHONE_REGEX,
  type TimeSlot,
} from '@mezon-tutors/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Resolver } from 'react-hook-form';
import { z } from 'zod';
import type { ProfileTabNumber } from './components/ProfileTabs';
import { PROFILE_TAB } from './components/ProfileTabs';
import type { TutorProfileFormValues } from './utils';

export type ProfileFormMessages = {
  about: (key: string) => string;
  photo: (key: string) => string;
  video: (key: string) => string;
  availability: (key: string, values?: Record<string, string>) => string;
};

const countryValues = Object.values(ECountry) as readonly string[];
const subjectValues = Object.values(ESubject) as readonly string[];
const languageValues = Object.values(ELanguage) as readonly string[];
const proficiencyValues = Object.values(EProficiencyLevel) as readonly string[];

const timeSlotSchema = z.object({
  startTime: z.string(),
  endTime: z.string(),
});

function languageEntriesSchema(t: ProfileFormMessages['about']) {
  return z
    .array(
      z.object({
        language: z.string().refine((v) => !v || languageValues.includes(v), {
          message: t('validation.languagesFromList'),
        }),
        proficiency: z.string().refine((v) => !v || proficiencyValues.includes(v), {
          message: t('validation.proficiencyFromList'),
        }),
      })
    )
    .superRefine((arr, ctx) => {
      const hasAnyCompletePair = arr.some((e) => e.language && e.proficiency);
      if (!hasAnyCompletePair) {
        const idx = arr.findIndex((e) => !e.language || !e.proficiency) ?? 0;
        const entry = arr[idx] ?? { language: '', proficiency: '' };
        if (!entry.language) {
          ctx.addIssue({
            code: 'custom',
            path: [idx, 'language'],
            message: t('validation.languagesRequired'),
          });
        }
        if (!entry.proficiency) {
          ctx.addIssue({
            code: 'custom',
            path: [idx, 'proficiency'],
            message: t('validation.proficiencyRequired'),
          });
        }
        return;
      }
      arr.forEach((entry, idx) => {
        const hasAnyValue = entry.language || entry.proficiency;
        if (!hasAnyValue) return;
        if (!entry.language) {
          ctx.addIssue({
            code: 'custom',
            path: [idx, 'language'],
            message: t('validation.languagesRequired'),
          });
        }
        if (!entry.proficiency) {
          ctx.addIssue({
            code: 'custom',
            path: [idx, 'proficiency'],
            message: t('validation.proficiencyRequired'),
          });
        }
      });
    });
}

export function createTutorProfileFormSchema(messages: ProfileFormMessages) {
  const t = messages.about;
  const tPhoto = messages.photo;
  const tVideo = messages.video;

  return z.object({
    firstName: z.string().trim().min(1, t('validation.firstNameRequired')),
    lastName: z.string().trim().min(1, t('validation.lastNameRequired')),
    email: z.string(),
    country: z
      .string()
      .min(1, t('validation.countryRequired'))
      .refine((v) => countryValues.includes(v), {
        message: t('validation.countryFromList'),
      }),
    phone: z
      .string()
      .min(1, t('validation.phoneRequired'))
      .transform((value) => value.replace(/[\s-]/g, ''))
      .refine((value) => VIETNAM_PHONE_REGEX.test(value), {
        message: t('validation.phoneInvalid'),
      }),
    subject: z
      .string()
      .min(1, t('validation.subjectRequired'))
      .refine((v) => subjectValues.includes(v), {
        message: t('validation.subjectFromList'),
      }),
    headline: z.string().trim().min(1, tPhoto('validation.headlineRequired')),
    motivate: z.string().trim().min(1, tPhoto('validation.motivateRequired')),
    introduce: z.string().trim().min(1, tPhoto('validation.introduceRequired')),
    videoUrl: z
      .string()
      .trim()
      .min(1, tVideo('errors.emptyLink'))
      .refine((url) => Boolean(parseYouTubeId(url)), {
        message: tVideo('errors.invalidLink'),
      }),
    hourlyRate: z.string(),
    currency: z.nativeEnum(ECurrency),
    languageEntries: languageEntriesSchema(t),
    slotsByDay: z.record(z.string(), z.array(timeSlotSchema)),
  });
}

export function createScheduleRateSchema(messages: ProfileFormMessages) {
  const tAv = messages.availability;

  return z
    .object({
      hourlyRate: z.string(),
      currency: z.nativeEnum(ECurrency),
    })
    .superRefine((data, ctx) => {
      const trimmed = data.hourlyRate.trim();
      if (!trimmed) {
        ctx.addIssue({
          code: 'custom',
          path: ['hourlyRate'],
          message: tAv('validation.hourlyRateRequired'),
        });
        return;
      }
      if (!HOURLY_RATE_REGEX.test(trimmed)) {
        ctx.addIssue({
          code: 'custom',
          path: ['hourlyRate'],
          message: tAv('validation.hourlyRateInvalidFormat'),
        });
        return;
      }
      const numValue = Number.parseFloat(trimmed);
      if (!Number.isFinite(numValue) || numValue <= 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['hourlyRate'],
          message: tAv('validation.hourlyRateGreaterThanZero'),
        });
        return;
      }
      const minPrice = MIN_PRICE[data.currency];
      if (numValue < minPrice) {
        ctx.addIssue({
          code: 'custom',
          path: ['hourlyRate'],
          message: tAv('validation.hourlyRateTooLow', {
            min: formatToCurrency(data.currency, minPrice),
          }),
        });
      }
    });
}

export function createScheduleTabSchema(
  messages: ProfileFormMessages,
  dayLabel: (dayIndex: number) => string
) {
  const tAv = messages.availability;

  return z
    .object({
      hourlyRate: z.string(),
      currency: z.nativeEnum(ECurrency),
      slotsByDay: z.record(z.string(), z.array(timeSlotSchema)),
    })
    .superRefine((data, ctx) => {
      const rateResult = createScheduleRateSchema(messages).safeParse(data);
      if (!rateResult.success) {
        for (const issue of rateResult.error.issues) {
          ctx.addIssue({
            code: 'custom',
            message: issue.message,
            path: issue.path,
          });
        }
      }

      const slotError = validateWeeklySlots(data.slotsByDay as Record<string, TimeSlot[]>, {
        weeklySlotsRequired: tAv('validation.weeklySlotsRequired'),
        timeRequired: tAv('validation.timeRequired'),
        minuteStepInvalid: tAv('validation.minuteStepInvalid'),
        endTimeMustBeAfterStartTime: tAv('validation.endTimeMustBeAfterStartTime'),
        duplicateSlot: (day) => tAv('validation.duplicateSlot', { day }),
        overlappingSlot: (day) => tAv('validation.overlappingSlot', { day }),
        dayLabel,
      });
      if (slotError) {
        ctx.addIssue({
          code: 'custom',
          path: ['slotsByDay'],
          message: slotError,
        });
      }
    });
}

export function createGeneralTabSchema(messages: ProfileFormMessages) {
  const full = createTutorProfileFormSchema(messages);
  return full.pick({
    firstName: true,
    lastName: true,
    country: true,
    phone: true,
    subject: true,
    languageEntries: true,
  });
}

export function createTutorInfoTabSchema(messages: ProfileFormMessages) {
  const full = createTutorProfileFormSchema(messages);
  return full.pick({
    headline: true,
    motivate: true,
    introduce: true,
    videoUrl: true,
  });
}

export function getProfileTabSchema(
  tab: ProfileTabNumber,
  messages: ProfileFormMessages,
  dayLabel: (dayIndex: number) => string
) {
  switch (tab) {
    case PROFILE_TAB.GENERAL:
      return createGeneralTabSchema(messages);
    case PROFILE_TAB.TUTOR_INFO:
      return createTutorInfoTabSchema(messages);
    case PROFILE_TAB.SCHEDULE:
      return createScheduleTabSchema(messages, dayLabel);
    default:
      return z.any();
  }
}

export function createTabAwareResolver(
  messages: ProfileFormMessages,
  getEditingTab: () => ProfileTabNumber | null,
  dayLabel: (dayIndex: number) => string
): Resolver<TutorProfileFormValues> {
  return async (values, context, options) => {
    const tab = getEditingTab();
    if (!tab) {
      return { values, errors: {} };
    }
    const schema = getProfileTabSchema(tab, messages, dayLabel);
    return zodResolver(schema)(values, context, options);
  };
}
