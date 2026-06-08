import { cookies } from "next/headers";
import { DEFAULT_LOCALE } from "@/i18n/request";

export type SeoMessages = {
  siteName: string;
  default: { title: string; description: string };
  home: { title: string; description: string };
  tutors: { title: string; description: string };
  tutorDetail: {
    title: string;
    description: string;
    fallbackTitle: string;
    fallbackDescription: string;
  };
  dashboard: { title: string; description: string };
  myLessons: { title: string; description: string };
  mySchedule: { title: string; description: string };
  wallet: { title: string; description: string };
  trialBookings: { title: string; description: string };
  tutorProfile: { title: string; description: string };
  becomeTutor: { title: string; description: string };
  checkoutTrial: { title: string; description: string };
  checkoutSubscription: { title: string; description: string };
  admin: { title: string; description: string };
  authCallback: { title: string; description: string };
  onboarding: { title: string; description: string };
};

const SUPPORTED_LOCALES = ["vi", "en"] as const;

async function loadSeoFile(locale: string) {
  try {
    return (await import(`@mezon-tutors/shared/locales/${locale}/seo.json`)).default as SeoMessages;
  } catch {
    return (await import("@mezon-tutors/shared/locales/vi/seo.json")).default as SeoMessages;
  }
}

export async function getSeoLocale(): Promise<string> {
  const cookieLocale = (await cookies()).get("NEXT_LOCALE")?.value;
  return SUPPORTED_LOCALES.includes(cookieLocale as (typeof SUPPORTED_LOCALES)[number])
    ? cookieLocale!
    : DEFAULT_LOCALE;
}

export async function getSeoMessages(): Promise<SeoMessages> {
  const locale = await getSeoLocale();
  return loadSeoFile(locale);
}
