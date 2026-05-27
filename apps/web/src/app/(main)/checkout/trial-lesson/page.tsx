import type { Metadata } from "next";
import { ROUTES } from "@mezon-tutors/shared";
import { createNoIndexMetadata } from "@/lib/seo";
import { getSeoMessages } from "@/lib/seo-messages";
import TrialLessonCheckoutPage from "@/views/main/checkout/trial-lesson";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoMessages();
  return createNoIndexMetadata({
    title: seo.checkoutTrial.title,
    description: seo.checkoutTrial.description,
    path: ROUTES.CHECKOUT.TRIAL_LESSON,
  });
}

export default function Page() {
  return <TrialLessonCheckoutPage />;
}
