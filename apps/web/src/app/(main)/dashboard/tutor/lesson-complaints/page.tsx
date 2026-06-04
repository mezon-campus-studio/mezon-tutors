import type { Metadata } from "next";
import { ROUTES } from "@mezon-tutors/shared";
import { createNoIndexMetadata } from "@/lib/seo";
import { getSeoMessages } from "@/lib/seo-messages";
import TutorLessonComplaintsView from "@/views/main/tutor-lesson-complaints";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoMessages();
  return createNoIndexMetadata({
    title: seo.dashboard.title,
    description: seo.dashboard.description,
    path: ROUTES.DASHBOARD.TUTOR_LESSON_COMPLAINTS,
  });
}

export default function Page() {
  return <TutorLessonComplaintsView />;
}
