import type { Metadata } from "next";
import { ROUTES } from "@mezon-tutors/shared";
import { createNoIndexMetadata } from "@/lib/seo";
import { getSeoMessages } from "@/lib/seo-messages";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoMessages();
  return createNoIndexMetadata({
    title: seo.checkoutTrial.title,
    description: seo.checkoutTrial.description,
    path: ROUTES.CHECKOUT.INDEX,
  });
}

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
