'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAtomValue } from 'jotai';
import { Loader2 } from 'lucide-react';
import { ROUTES, VerificationStatus, BECOME_TUTOR_STEPS, STEP_ROUTES, isEditRoute } from '@mezon-tutors/shared';
import { useGetMyTutorProfileStatus } from '@/services';
import { tutorProfileCurrentStepAtom } from '@mezon-tutors/app/store';

interface BecomeTutorGuardProps {
  children: React.ReactNode;
}

const SUBMITTED_STATUSES = [
  VerificationStatus.PENDING,
  VerificationStatus.APPROVED,
  VerificationStatus.REJECTED,
];

function isApplicationSubmitted(status: VerificationStatus | null): boolean {
  return status !== null && SUBMITTED_STATUSES.includes(status);
}

export function BecomeTutorGuard({ children }: BecomeTutorGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { data, isLoading } = useGetMyTutorProfileStatus();
  const currentStep = useAtomValue(tutorProfileCurrentStepAtom);

  useEffect(() => {
    if (isLoading || !data) return;

    const hasProfile = data.hasProfile;
    const isOnRootPage = pathname === ROUTES.BECOME_TUTOR.INDEX;
    const isOnEditPage = isEditRoute(pathname);
    const hasSubmittedApplication = isApplicationSubmitted(data.verificationStatus);

    if (!hasProfile) {
      if (isOnRootPage) {
        const currentStepRoute = STEP_ROUTES[currentStep] || '/about';
        router.replace(ROUTES.BECOME_TUTOR.INDEX + currentStepRoute);
        return;
      }
      
      if (!isOnEditPage) {
        router.replace(ROUTES.BECOME_TUTOR.INDEX + '/about');
        return;
      }
      return;
    }

    if (hasProfile && hasSubmittedApplication && isOnEditPage) {
      router.replace(ROUTES.BECOME_TUTOR.INDEX + '/final');
      return;
    }

    if (hasProfile && isOnRootPage) {
      router.replace(ROUTES.BECOME_TUTOR.INDEX + '/final');
    }
  }, [data, isLoading, pathname, currentStep]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="min-h-[70vh] flex items-center justify-center px-4 md:px-6">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
