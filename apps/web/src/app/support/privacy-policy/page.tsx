import type { Metadata } from "next";
import { ROUTES } from "@mezon-tutors/shared";
import { createPageMetadata } from "@/lib/seo";
import { getSeoMessages } from "@/lib/seo-messages";
import SupportLegalPage from "@/views/main/support/legal/SupportLegalPage";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoMessages();
  return createPageMetadata({
    title: seo.privacyPolicy.title,
    description: seo.privacyPolicy.description,
    path: ROUTES.SUPPORT.PRIVACY_POLICY,
  });
}

export default function PrivacyPolicyPage() {
  return <SupportLegalPage pageKey="PrivacyPolicy" />;
}
