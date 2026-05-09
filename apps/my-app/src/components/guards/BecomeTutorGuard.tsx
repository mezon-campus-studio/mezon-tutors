'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAtomValue } from 'jotai';
import { Spinner } from '@/components/ui';
import { useGetMyProfile } from '@/services';
import { userAtom, isLoadingAtom, isEditingRejectedProfileAtom, tutorProfileCurrentStepAtom } from '@/store';
import { getStepRoute } from '@mezon-tutors/shared';

interface BecomeTutorGuardProps {
  children: React.ReactNode;
}

export function BecomeTutorGuard({ children }: BecomeTutorGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAtomValue(userAtom);
  const isAuthLoading = useAtomValue(isLoadingAtom);
  const isEditingRejected = useAtomValue(isEditingRejectedProfileAtom);
  const currentStep = useAtomValue(tutorProfileCurrentStepAtom);
  const { data, isLoading: isProfileLoading } = useGetMyProfile({ enabled: !!user });

  useEffect(() => {
    if (isAuthLoading) return;

    if (!user) {
      router.replace('/become-tutor');
      return;
    }

    if (isProfileLoading || !data) return;

    const hasProfile = data.hasProfile;

    if (hasProfile && !isEditingRejected) {
      router.replace('/become-tutor/final');
      return;
    }

    const isRootPage = pathname === '/become-tutor';
    
    if (isRootPage && (!hasProfile || isEditingRejected)) {
      const targetRoute = getStepRoute(currentStep);
      router.replace(targetRoute);
    }
  }, [data, isProfileLoading, pathname, user, isAuthLoading, isEditingRejected, currentStep, router]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="min-h-[70vh] flex items-center justify-center px-4 md:px-6">
          <Spinner className="h-8 w-8 text-primary" />
        </div>
      </div>
    );
  }

  if (user && isProfileLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="min-h-[70vh] flex items-center justify-center px-4 md:px-6">
          <Spinner className="h-8 w-8 text-primary" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
