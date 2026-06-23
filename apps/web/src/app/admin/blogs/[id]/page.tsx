import AdminBlogDetailView from "@/views/admin/blogs/detail";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminBlogDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <AdminBlogDetailView blogId={id} />;
}
