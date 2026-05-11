import AdminLayout from "@/components/admin/AdminLayout";
import { AdminGuard } from "@/components/guards/AdminGuard";

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminGuard>
      <AdminLayout>{children}</AdminLayout>
    </AdminGuard>
  );
}
