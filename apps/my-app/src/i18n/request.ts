import { getRequestConfig, RequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

const SUPPORTED_LOCALES = ["vi", "en"] as const;

type MessageLoaderConfig = {
  messageKey: "Common" | "Home" | "TutorProfile" | "Tutors" | "GlobalChat" | "TrialLessonCheckout" | "SubscriptionCheckout" | "BecomeTutorGuide" | "Dashboard" | "MyLessons";
  file: string;
  pick?: (payload: Record<string, unknown>) => unknown;
};

const MESSAGE_LOADERS: MessageLoaderConfig[] = [
  { messageKey: "Common", file: "common" },
  { messageKey: "GlobalChat", file: "global-chat" },
  { messageKey: "Home", file: "home", pick: (payload) => payload.Home },
  { messageKey: "TutorProfile", file: "tutor-profile" },
  { messageKey: "Tutors", file: "tutors" },
  { messageKey: "Dashboard", file: "dashboard", pick: (payload) => payload.Dashboard },
  { messageKey: "MyLessons", file: "my-lessons" },
  {
    messageKey: "TrialLessonCheckout",
    file: "trial-lesson-checkout",
    pick: (payload) => payload.TrialLessonCheckout,
  },
  {
    messageKey: "SubscriptionCheckout",
    file: "subscription-checkout",
    pick: (payload) => payload.SubscriptionCheckout,
  },
];

const loadMessage = async (locale: string, file: string) => {
  try {
    return (await import(`@mezon-tutors/shared/locales/${locale}/${file}.json`)).default;
  } catch {
    return (await import(`@mezon-tutors/shared/locales/vi/${file}.json`)).default;
  }
};

export default getRequestConfig(async (): Promise<RequestConfig> => {
  const cookieLocale = (await cookies()).get("NEXT_LOCALE")?.value;

  const locale = SUPPORTED_LOCALES.includes(cookieLocale as (typeof SUPPORTED_LOCALES)[number])
    ? cookieLocale!
    : "vi";

  const messages = Object.fromEntries(
    await Promise.all(
      MESSAGE_LOADERS.map(async ({ messageKey, file, pick }) => {
        const payload = await loadMessage(locale, file);
        return [messageKey, pick ? pick(payload) : payload];
      })
    )
  );

  return {
    locale,
    messages,
  };
});
