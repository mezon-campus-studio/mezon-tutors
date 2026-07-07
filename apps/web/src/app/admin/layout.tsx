import type { Metadata } from "next";
import { ROUTES } from "@mezon-tutors/shared";
import { createNoIndexMetadata } from "@/lib/seo";
import { getSeoMessages } from "@/lib/seo-messages";
import AdminLayout from "@/components/admin/AdminLayout";
import { RoleGuard } from "@/components/guards/RoleGuard";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoMessages();
  return createNoIndexMetadata({
    title: seo.admin.title,
    description: seo.admin.description,
    path: ROUTES.ADMIN.TUTOR_APPLICATIONS,
  });
}

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard allowedRoles={["ADMIN", "CTV"]}>
      <AdminLayout>{children}</AdminLayout>
    </RoleGuard>
  );
}
