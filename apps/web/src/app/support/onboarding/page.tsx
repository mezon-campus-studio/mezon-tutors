import type { Metadata } from "next";
import { ROUTES } from "@mezon-tutors/shared";
import { createPageMetadata } from "@/lib/seo";
import { getSeoMessages } from "@/lib/seo-messages";
import OnboardingView from "@/views/main/support/onboarding";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoMessages();
  return createPageMetadata({
    title: seo.onboarding.title,
    description: seo.onboarding.description,
    path: ROUTES.SUPPORT.ONBOARDING,
  });
}

export default function OnboardingPage() {
  return <OnboardingView />;
}
