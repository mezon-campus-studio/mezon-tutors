import AdminLayout from "@/components/admin/AdminLayout";
import { RoleGuard } from "@/components/guards/RoleGuard";

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard allowedRoles={["ADMIN"]}>
      <AdminLayout>{children}</AdminLayout>
    </RoleGuard>
  );
}
