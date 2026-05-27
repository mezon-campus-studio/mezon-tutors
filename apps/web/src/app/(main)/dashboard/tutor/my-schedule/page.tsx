import type { Metadata } from "next";
import { ROUTES } from "@mezon-tutors/shared";
import { createNoIndexMetadata } from "@/lib/seo";
import { getSeoMessages } from "@/lib/seo-messages";
import MyScheduleView from '@/views/main/my-schedule';

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoMessages();
  return createNoIndexMetadata({
    title: seo.mySchedule.title,
    description: seo.mySchedule.description,
    path: ROUTES.DASHBOARD.MY_SCHEDULE,
  });
}

export default function Page() {
  return <MyScheduleView />;
}
