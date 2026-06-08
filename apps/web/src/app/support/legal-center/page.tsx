import type { Metadata } from "next";
import { ROUTES } from "@mezon-tutors/shared";
import { createPageMetadata } from "@/lib/seo";
import { getSeoMessages } from "@/lib/seo-messages";
import SupportLegalCenterPage from "@/views/main/support/legal-center";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoMessages();
  return createPageMetadata({
    title: seo.legalCenter.title,
    description: seo.legalCenter.description,
    path: ROUTES.SUPPORT.LEGAL_CENTER,
  });
}

export default function LegalCenterPage() {
  return <SupportLegalCenterPage />;
}
