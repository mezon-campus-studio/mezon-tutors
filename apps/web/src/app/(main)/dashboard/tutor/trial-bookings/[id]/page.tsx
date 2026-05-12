import TrialBookingDetailView from '@/views/main/trial-bookings/detail';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: PageProps) {
  const { id } = await params;

  return <TrialBookingDetailView bookingId={id} />;
}
