'use client';

import { useParams } from 'next/navigation';
import TrialBookingDetailView from '@/views/main/trial-bookings/detail';

export default function TrialBookingDetailPage() {
  const params = useParams<{ id: string }>();
  const bookingId = params?.id;

  if (!bookingId) {
    return null;
  }

  return <TrialBookingDetailView bookingId={bookingId} />;
}
