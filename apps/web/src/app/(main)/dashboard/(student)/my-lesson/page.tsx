import type { Metadata } from "next";
import { ROUTES } from "@mezon-tutors/shared";
import { createNoIndexMetadata } from "@/lib/seo";
import { getSeoMessages } from "@/lib/seo-messages";
import MyLessonsPage from '@/views/main/my-lessons';

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoMessages();
  return createNoIndexMetadata({
    title: seo.myLessons.title,
    description: seo.myLessons.description,
    path: ROUTES.DASHBOARD.MY_LESSONS,
  });
}

export default function Page() {
  return <MyLessonsPage />;
}
