import { MEZON_URL } from './mezon';
import { ROUTES } from './routes';

export const ONBOARDING_PROFILE_ROLES = ['student', 'tutor'] as const;

export type OnboardingProfileRole = (typeof ONBOARDING_PROFILE_ROLES)[number];

export const ONBOARDING_SECTIONS = ['roleGuide', 'utilities'] as const;

export type OnboardingSection = (typeof ONBOARDING_SECTIONS)[number];

export const ONBOARDING_ROLES = [...ONBOARDING_PROFILE_ROLES, 'utilities'] as const;

export type OnboardingRole = (typeof ONBOARDING_ROLES)[number];

export type OnboardingStepIconKey =
  | 'userCircle'
  | 'search'
  | 'calendarCheck'
  | 'video'
  | 'wallet'
  | 'graduationCap'
  | 'sparkles'
  | 'shieldCheck'
  | 'calendarDays'
  | 'banknote'
  | 'refreshCw'
  | 'userPen'
  | 'users'
  | 'mic'
  | 'bot'
  | 'terminal'
  | 'palette'
  | 'bell'
  | 'messageSquare'
  | 'monitorUp'
  | 'smartphone';

export type OnboardingStepConfig = {
  id: string;
  iconKey: OnboardingStepIconKey;
  accent: string;
  tipKeys: readonly string[];
  imageSrcs?: readonly string[];
};

const ONBOARDING_IMAGE_BASE = '/images/onboarding/tutor';

export const ONBOARDING_STUDENT_STEPS: readonly OnboardingStepConfig[] = [
  {
    id: 'myLessons',
    iconKey: 'calendarDays',
    accent: 'from-violet-500 to-purple-500',
    tipKeys: ['tip1', 'tip2', 'tip3'],
  },
  {
    id: 'pendingBookings',
    iconKey: 'banknote',
    accent: 'from-purple-500 to-fuchsia-500',
    tipKeys: ['tip1', 'tip2', 'tip3'],
  },
  {
    id: 'wallet',
    iconKey: 'wallet',
    accent: 'from-fuchsia-500 to-rose-500',
    tipKeys: ['tip1', 'tip2', 'tip3'],
  },
  {
    id: 'complaints',
    iconKey: 'shieldCheck',
    accent: 'from-rose-500 to-orange-500',
    tipKeys: ['tip1', 'tip2', 'tip3'],
  },
  {
    id: 'cancelAndSchedule',
    iconKey: 'refreshCw',
    accent: 'from-amber-500 to-rose-500',
    tipKeys: ['tip1', 'tip2', 'tip3'],
  },
  {
    id: 'reminder',
    iconKey: 'bell',
    accent: 'from-emerald-500 to-teal-500',
    tipKeys: ['tip1', 'tip2', 'tip3'],
  },
] as const;

export const ONBOARDING_TUTOR_STEPS: readonly OnboardingStepConfig[] = [
  {
    id: 'createClan',
    iconKey: 'users',
    accent: 'from-violet-500 to-purple-500',
    tipKeys: ['tip1', 'tip2', 'tip3'],
    imageSrcs: [`${ONBOARDING_IMAGE_BASE}/tutor-1_2.png`, `${ONBOARDING_IMAGE_BASE}/tutor-1_3.png`],
  },
  {
    id: 'voiceChannels',
    iconKey: 'mic',
    accent: 'from-purple-500 to-fuchsia-500',
    tipKeys: ['tip1', 'tip2', 'tip3'],
    imageSrcs: [
      `${ONBOARDING_IMAGE_BASE}/tutor-2_1.png`,
      `${ONBOARDING_IMAGE_BASE}/tutor-2_2.png`,
      `${ONBOARDING_IMAGE_BASE}/tutor-2_1.png`,
    ],
  },
  {
    id: 'inviteBot',
    iconKey: 'bot',
    accent: 'from-fuchsia-500 to-rose-500',
    tipKeys: ['tip1', 'tip2', 'tip3'],
    imageSrcs: [
      `${ONBOARDING_IMAGE_BASE}/tutor-3_1.png`,
      `${ONBOARDING_IMAGE_BASE}/tutor-3_2.png`,
      `${ONBOARDING_IMAGE_BASE}/tutor-3_3.png`,
    ],
  },
  {
    id: 'setupCommand',
    iconKey: 'terminal',
    accent: 'from-rose-500 to-orange-500',
    tipKeys: ['tip1', 'tip2', 'tip3'],
    imageSrcs: [
      `${ONBOARDING_IMAGE_BASE}/tutor-4_1.png`,
      `${ONBOARDING_IMAGE_BASE}/tutor-4_1.png`,
      `${ONBOARDING_IMAGE_BASE}/tutor-4_1.png`,
    ],
  },
  {
    id: 'customizeClan',
    iconKey: 'palette',
    accent: 'from-amber-500 to-rose-500',
    tipKeys: ['tip1', 'tip2', 'tip3'],
  },
  {
    id: 'reminder',
    iconKey: 'bell',
    accent: 'from-emerald-500 to-teal-500',
    tipKeys: ['tip1', 'tip2', 'tip3'],
  },
] as const;

export const ONBOARDING_UTILITIES_STEPS: readonly OnboardingStepConfig[] = [
  {
    id: 'botCommands',
    iconKey: 'terminal',
    accent: 'from-violet-500 to-purple-500',
    tipKeys: ['tip1', 'tip2', 'tip3'],
  },
  {
    id: 'channelApps',
    iconKey: 'sparkles',
    accent: 'from-purple-500 to-fuchsia-500',
    tipKeys: ['tip1', 'tip2', 'tip3', 'tip4', 'tip5'],
  },
] as const;

export const ONBOARDING_STEPS_BY_ROLE: Record<OnboardingRole, readonly OnboardingStepConfig[]> = {
  student: ONBOARDING_STUDENT_STEPS,
  tutor: ONBOARDING_TUTOR_STEPS,
  utilities: ONBOARDING_UTILITIES_STEPS,
};

export const ONBOARDING_CHECKLIST_AUTO_INTERVAL_MS = 10_000;
export const ONBOARDING_CHECKLIST_RING_RADIUS = 16;
export const ONBOARDING_CHECKLIST_RING_STROKE = 2.5;

export const ONBOARDING_AVATAR_OPACITY_CLASS = ['opacity-100', 'opacity-60', 'opacity-30'] as const;

const ONBOARDING_STUDENT_ACTION_ROUTES: Partial<Record<string, string>> = {
  myLessons: ROUTES.DASHBOARD.MY_LESSONS,
  pendingBookings: ROUTES.DASHBOARD.PENDING_BOOKINGS,
  wallet: ROUTES.DASHBOARD.WALLET,
  complaints: ROUTES.DASHBOARD.COMPLAINTS,
  cancelAndSchedule: ROUTES.DASHBOARD.MY_LESSONS,
  reminder: ROUTES.DASHBOARD.MY_LESSONS,
};

const ONBOARDING_TUTOR_ACTION_ROUTES: Partial<Record<string, string>> = {
  createClan: MEZON_URL,
  voiceChannels: MEZON_URL,
  setupCommand: MEZON_URL,
  customizeClan: MEZON_URL,
  reminder: ROUTES.DASHBOARD.MY_SCHEDULE,
};

const ONBOARDING_UTILITIES_ACTION_ROUTES: Partial<Record<string, string>> = {
  botCommands: MEZON_URL,
  channelApps: MEZON_URL,
};

export const ONBOARDING_ACTION_ROUTES_BY_ROLE: Record<
  OnboardingRole,
  Partial<Record<string, string>>
> = {
  student: ONBOARDING_STUDENT_ACTION_ROUTES,
  tutor: ONBOARDING_TUTOR_ACTION_ROUTES,
  utilities: ONBOARDING_UTILITIES_ACTION_ROUTES,
};
