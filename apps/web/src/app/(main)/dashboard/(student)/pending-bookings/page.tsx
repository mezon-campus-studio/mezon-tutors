import type { Metadata } from "next";
import { ROUTES } from "@mezon-tutors/shared";
import { createNoIndexMetadata } from "@/lib/seo";
import { getSeoMessages } from "@/lib/seo-messages";
import PendingBookingsPage from "@/views/main/pending-bookings";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoMessages();
  return createNoIndexMetadata({
    title: seo.dashboard?.title ?? "Pending bookings",
    description: seo.dashboard?.description ?? "Complete payment for your trial lesson bookings.",
    path: ROUTES.DASHBOARD.PENDING_BOOKINGS,
  });
}

export default function Page() {
  return <PendingBookingsPage />;
}
