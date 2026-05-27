import type { Metadata } from "next";
import { ROUTES } from "@mezon-tutors/shared";
import { createNoIndexMetadata } from "@/lib/seo";
import { getSeoMessages } from "@/lib/seo-messages";
import TutorProfileView from "@/views/main/tutor-profile";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoMessages();
  return createNoIndexMetadata({
    title: seo.tutorProfile.title,
    description: seo.tutorProfile.description,
    path: ROUTES.DASHBOARD.TUTOR_PROFILE,
  });
}

export default function Page() {
  return <TutorProfileView />;
}
