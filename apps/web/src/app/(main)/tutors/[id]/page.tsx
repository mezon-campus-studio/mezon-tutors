import type { Metadata } from "next";
import { buildTutorDetailMetadata } from "@/lib/seo";
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
  
  return <TutorDetailPage tutorId={id} />;
}
