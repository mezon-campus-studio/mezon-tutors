import type { Metadata } from "next";
import { notFound } from 'next/navigation';
import { buildTutorDetailMetadata } from "@/lib/seo";
import { fetchTutorAboutById } from '@/services';
import TutorDetailPage from '@/views/main/tutors/detail';

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return buildTutorDetailMetadata(id);
}

export default async function Page({ params }: Props) {
  const { id } = await params;
  const aboutData = await fetchTutorAboutById(id);
  if (!aboutData) notFound();
  return <TutorDetailPage tutorId={id} aboutData={aboutData} />;
}
