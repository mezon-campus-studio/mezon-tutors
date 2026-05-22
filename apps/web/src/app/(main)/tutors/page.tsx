import type { Metadata } from "next";
import { ROUTES } from "@mezon-tutors/shared";
import { createPageMetadata } from "@/lib/seo";
import { getSeoMessages } from "@/lib/seo-messages";
import TutorsPage from "@/views/main/tutors";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoMessages();
  return createPageMetadata({
    title: seo.tutors.title,
    description: seo.tutors.description,
    path: ROUTES.TUTOR.INDEX,
  });
}

export default function Page() {
  return <TutorsPage />;
}
