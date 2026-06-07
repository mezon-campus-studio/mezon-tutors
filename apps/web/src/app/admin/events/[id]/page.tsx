import AdminEventDetailView from "@/views/admin/events/detail";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminEventDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <AdminEventDetailView eventId={id} />;
}
