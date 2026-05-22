import type { Metadata } from "next";
import { ROUTES } from "@mezon-tutors/shared";
import { createNoIndexMetadata } from "@/lib/seo";
import { getSeoMessages } from "@/lib/seo-messages";
import BecomeTutorClientLayout from "@/components/layouts/BecomeTutorClientLayout";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoMessages();
  return createNoIndexMetadata({
    title: seo.becomeTutor.title,
    description: seo.becomeTutor.description,
    path: ROUTES.BECOME_TUTOR.INDEX,
  });
}

export default function BecomeTutorLayout({ children }: { children: React.ReactNode }) {

  return (
    <BecomeTutorClientLayout>{children}</BecomeTutorClientLayout>
  );
}
