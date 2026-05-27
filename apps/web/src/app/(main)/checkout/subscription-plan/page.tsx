import type { Metadata } from "next";
import { ROUTES } from "@mezon-tutors/shared";
import { createNoIndexMetadata } from "@/lib/seo";
import { getSeoMessages } from "@/lib/seo-messages";
import SubscriptionPlanCheckoutPage from "@/views/main/checkout/subscription-plan";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoMessages();
  return createNoIndexMetadata({
    title: seo.checkoutSubscription.title,
    description: seo.checkoutSubscription.description,
    path: ROUTES.CHECKOUT.SUBSCRIPTION_PLAN,
  });
}

export default function Page() {
  return <SubscriptionPlanCheckoutPage />;
}
