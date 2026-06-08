import type { Metadata } from "next";
import { ROUTES } from "@mezon-tutors/shared";
import { createPageMetadata } from "@/lib/seo";
import { getSeoMessages } from "@/lib/seo-messages";
import SupportLegalPage from "@/views/main/support/legal/SupportLegalPage";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoMessages();
  return createPageMetadata({
    title: seo.tutorPolicy.title,
    description: seo.tutorPolicy.description,
    path: ROUTES.SUPPORT.TUTOR_POLICY,
  });
}

export default function TutorPolicyPage() {
  return <SupportLegalPage pageKey="TutorPolicy" />;
}
