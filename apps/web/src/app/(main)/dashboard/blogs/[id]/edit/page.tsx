import CreateBlogView from "@/views/blogs/create-blog";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditBlogPage({ params }: PageProps) {
  const { id } = await params;
  return <CreateBlogView blogId={id} />;
}
