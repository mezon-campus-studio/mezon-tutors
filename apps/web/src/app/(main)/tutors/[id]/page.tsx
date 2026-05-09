import TutorDetailPage from '@/views/main/tutors/detail';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: Props) {
  const { id } = await params;
  
  return <TutorDetailPage tutorId={id} />;
}
