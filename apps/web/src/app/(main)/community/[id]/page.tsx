import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchCommunityPostById } from '@/services';
import CommunityPostDetailPage from '@/views/community/post-detail';

type PageProps = {
  params: Promise<{ id: string }>;
};

export const revalidate = 0;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const post = await fetchCommunityPostById(id);
  if (!post) return { title: 'Community' };
  const preview = post.content.trim().slice(0, 60) || 'Community post';
  return {
    title: preview,
    description: post.content.slice(0, 160),
  };
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  const post = await fetchCommunityPostById(id);
  if (!post) notFound();
  return <CommunityPostDetailPage post={post} />;
}
