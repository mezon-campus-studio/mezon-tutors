import type { Metadata } from "next";
import { ROUTES } from "@mezon-tutors/shared";
import { createNoIndexMetadata } from "@/lib/seo";
import { getSeoMessages } from "@/lib/seo-messages";
import TrialBookingsView from '@/views/main/trial-bookings';

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoMessages();
  return createNoIndexMetadata({
    title: seo.trialBookings.title,
    description: seo.trialBookings.description,
    path: ROUTES.DASHBOARD.TRIAL_BOOKING,
  });
}

export default function Page() {
  return <TrialBookingsView />;
}
