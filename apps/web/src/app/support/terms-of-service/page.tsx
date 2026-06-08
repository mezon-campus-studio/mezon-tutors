import type { Metadata } from "next";
import { ROUTES } from "@mezon-tutors/shared";
import { createPageMetadata } from "@/lib/seo";
import { getSeoMessages } from "@/lib/seo-messages";
import SupportLegalPage from "@/views/main/support/legal/SupportLegalPage";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoMessages();
  return createPageMetadata({
    title: seo.termsOfService.title,
    description: seo.termsOfService.description,
    path: ROUTES.SUPPORT.TERMS_OF_SERVICE,
  });
}

export default function TermsOfServicePage() {
  return <SupportLegalPage pageKey="TermsOfService" />;
}
