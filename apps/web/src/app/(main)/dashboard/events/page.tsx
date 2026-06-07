import type { Metadata } from "next";
import { ROUTES } from "@mezon-tutors/shared";
import { createNoIndexMetadata } from "@/lib/seo";
import { getSeoMessages } from "@/lib/seo-messages";
import { RoleGuard } from "@/components/guards/RoleGuard";
import MyEventsView from "@/views/dashboard/my-events";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoMessages();
  return createNoIndexMetadata({
    title: seo.dashboard?.title ?? "My events",
    description: seo.dashboard?.description ?? "Manage your submitted events.",
    path: ROUTES.DASHBOARD.MY_EVENTS,
  });
}

export default function Page() {
  return (
    <RoleGuard allowedRoles={["STUDENT", "TUTOR", "ADMIN"]}>
      <MyEventsView />
    </RoleGuard>
  );
}
