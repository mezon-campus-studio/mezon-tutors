import type { Metadata } from "next";
import { ROUTES } from "@mezon-tutors/shared";
import { RoleGuard } from "@/components/guards/RoleGuard";
import SavedTutorsView from "@/views/main/saved-tutors";
import { createNoIndexMetadata } from "@/lib/seo";
import { getSeoMessages } from "@/lib/seo-messages";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoMessages();
  return createNoIndexMetadata({
    title: seo.savedTutors.title,
    description: seo.savedTutors.description,
    path: ROUTES.SAVED_TUTORS,
  });
}

export default function SavedTutorsPage() {
  return (
    <RoleGuard allowedRoles={["STUDENT"]}>
      <SavedTutorsView />
    </RoleGuard>
  );
}
