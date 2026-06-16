export const DEFAULT_LOCALE = "vi" as const;

const SUPPORTED_LOCALES = ["vi", "en"] as const;

type MessageLoaderConfig = {
  messageKey: string;
  file: string;
  pick?: (payload: Record<string, unknown>) => unknown;
};

const MESSAGE_LOADERS: MessageLoaderConfig[] = [
  { messageKey: "Common", file: "common" },
  { messageKey: "Notifications", file: "notifications" },
  { messageKey: "GlobalChat", file: "global-chat" },
  { messageKey: "Home", file: "home", pick: (payload) => payload.Home },
  { messageKey: "Events", file: "events", pick: (payload) => payload.Events },
  { messageKey: "TutorProfile", file: "tutor-profile" },
  { messageKey: "Tutors", file: "tutors" },
  { messageKey: "BecomeTutorGuide", file: "become-tutor-guide" },
  { messageKey: "BecomeTutor", file: "become-tutor" },
  { messageKey: "Dashboard", file: "dashboard", pick: (payload) => payload.Dashboard },
  { messageKey: "MyLessons", file: "my-lessons" },
  { messageKey: "MySchedule", file: "my-schedule" },
  { messageKey: "Wallet", file: "wallet", pick: (payload) => payload.Wallet },
  { messageKey: "Settings", file: "settings", pick: (payload) => payload.Settings },
  {
    messageKey: "TrialLessonCheckout",
    file: "trial-lesson-checkout",
    pick: (payload) => payload.TrialLessonCheckout,
  },
  {
    messageKey: "LessonCheckout",
    file: "trial-lesson-checkout",
    pick: (payload) => {
      const trial = payload as { TrialLessonCheckout?: { Result?: { cancel?: unknown } } };
      return { Result: { cancel: trial.TrialLessonCheckout?.Result?.cancel } };
    },
  },
  {
    messageKey: "SubscriptionCheckout",
    file: "subscription-checkout",
    pick: (payload) => payload.SubscriptionCheckout,
  },
  { messageKey: "Admin", file: "admin", pick: (payload) => payload.Admin },
  {
    messageKey: "AdminTutorApplicationDetail",
    file: "admin-tutor-applications",
    pick: (payload) => payload.Detail,
  },
  { messageKey: "Onboarding", file: "onboarding" },
  { messageKey: "Legal", file: "legal" },
  { messageKey: "Practice", file: "practice" },
  { messageKey: "Groups", file: "groups", pick: (payload) => payload.Groups },
];

const loadMessage = async (locale: string, file: string) => {
  try {
    return (await import(`@mezon-tutors/shared/locales/${locale}/${file}.json`)).default;
  } catch {
    return (await import(`@mezon-tutors/shared/locales/vi/${file}.json`)).default;
  }
};

export function resolveLocale(cookieLocale?: string | null): string {
  return SUPPORTED_LOCALES.includes(cookieLocale as (typeof SUPPORTED_LOCALES)[number])
    ? cookieLocale!
    : DEFAULT_LOCALE;
}

export async function loadMessagesForLocale(locale: string) {
  return Object.fromEntries(
    await Promise.all(
      MESSAGE_LOADERS.map(async ({ messageKey, file, pick }) => {
        const payload = await loadMessage(locale, file);
        return [messageKey, pick ? pick(payload) : payload];
      }),
    ),
  );
}
