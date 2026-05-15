'use client';

import { useAtomValue } from 'jotai';
import { isLoadingAtom } from '@/store';
import { BecomeTutorGuide } from '@/views/main/become-tutor/guide';
import { Spinner } from '@/components/ui';

export default function BecomeTutorPage() {
  const isLoading = useAtomValue(isLoadingAtom);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  return <BecomeTutorGuide />;
}
