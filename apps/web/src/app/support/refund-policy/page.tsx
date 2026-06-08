import type { Metadata } from "next";
import { ROUTES } from "@mezon-tutors/shared";
import { createPageMetadata } from "@/lib/seo";
import { getSeoMessages } from "@/lib/seo-messages";
import SupportLegalPage from "@/views/main/support/legal/SupportLegalPage";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoMessages();
  return createPageMetadata({
    title: seo.refundPolicy.title,
    description: seo.refundPolicy.description,
    path: ROUTES.SUPPORT.REFUND_POLICY,
  });
}

export default function RefundPolicyPage() {
  return <SupportLegalPage pageKey="RefundPolicy" />;
}
