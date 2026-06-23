import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchPublishedBlogBySlug } from "@/services";
import BlogDetailPage from "@/views/blogs/blog-detail";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const revalidate = 0;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await fetchPublishedBlogBySlug(slug);
  if (!post) {
    return { title: "Blog" };
  }
  return {
    title: post.seoTitle ?? post.title,
    description: post.seoDescription ?? post.excerpt ?? undefined,
    openGraph: {
      title: post.seoTitle ?? post.title,
      description: post.seoDescription ?? post.excerpt ?? undefined,
      images: post.ogImageUrl ? [post.ogImageUrl] : post.coverImageUrl ? [post.coverImageUrl] : undefined,
    },
  };
}

export default async function BlogPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await fetchPublishedBlogBySlug(slug);
  if (!post) notFound();

  return <BlogDetailPage post={post} />;
}
