import TrialLessonCheckoutSuccessPage from '@/views/main/checkout/trial-lesson/success';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: PageProps) {
  const { id } = await params;

  return <TrialLessonCheckoutSuccessPage bookingId={id} />;
}