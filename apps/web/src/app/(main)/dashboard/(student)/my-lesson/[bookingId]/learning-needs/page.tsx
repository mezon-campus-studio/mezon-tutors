import { ROUTES } from '@mezon-tutors/shared';
import type { Metadata } from 'next';
import { createNoIndexMetadata } from '@/lib/seo';
import { LearningNeedsPage } from '@/views/main/learning-needs/LearningNeedsPage';

export async function generateMetadata(): Promise<Metadata> {
  return createNoIndexMetadata({
    title: 'Learning needs',
    description: 'Share your goals and learning preferences with your tutor.',
    path: ROUTES.DASHBOARD.MY_LESSONS,
  });
}

export default async function Page({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  return <LearningNeedsPage bookingId={bookingId} />;
}
