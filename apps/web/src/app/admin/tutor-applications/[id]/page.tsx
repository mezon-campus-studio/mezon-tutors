import AdminTutorApplicationDetailView from "@/views/admin/tutor-applications/detail";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminTutorApplicationDetailPage({
  params,
}: PageProps) {
  const { id } = await params;
  return <AdminTutorApplicationDetailView id={id} />;
}
