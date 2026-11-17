'use client';

import { ROUTES } from '@mezon-tutors/shared';
import { useRouter } from 'next/navigation';
import { LearningNeedsDialog } from './LearningNeedsDialog';

type LearningNeedsPageProps = {
  bookingId: string;
};

export function LearningNeedsPage({ bookingId }: LearningNeedsPageProps) {
  const router = useRouter();

  return (
    <LearningNeedsDialog
      bookingId={bookingId}
      open
      initialView="edit"
      presentation="page"
      onOpenChange={(open) => {
        if (!open) router.push(ROUTES.DASHBOARD.MY_LESSONS);
      }}
    />
  );
}
