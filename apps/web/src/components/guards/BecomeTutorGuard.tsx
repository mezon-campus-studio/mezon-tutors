'use client';

import { useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAtomValue } from 'jotai';
import { getStepRoute, ROUTES } from '@mezon-tutors/shared';
import { Spinner } from '@/components/ui';
import { useGetMyProfile } from '@/services';
import {
  type AuthUser,
  userAtom,
  isLoadingAtom,
  isEditingRejectedProfileAtom,
  tutorProfileCurrentStepAtom,
  tutorProfileStepStatusesAtom,
  type TutorProfileStepId,
  type TutorProfileStepStatus,
} from '@/store';

interface BecomeTutorGuardProps {
  children: React.ReactNode;
}

function BecomeTutorGuardLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-[70vh] items-center justify-center px-4 md:px-6">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    </div>
  );
}

function getBecomeTutorRedirectTarget({
  pathname,
  user,
  hasProfile,
  isEditingRejected,
  currentStep,
  stepStatuses,
}: {
  pathname: string;
  user: AuthUser | null;
  hasProfile: boolean;
  isEditingRejected: boolean;
  currentStep: TutorProfileStepId;
  stepStatuses: Record<TutorProfileStepId, TutorProfileStepStatus>;
}): string | null {
  if (!user) {
    if (pathname !== ROUTES.BECOME_TUTOR.INDEX && pathname.startsWith(`${ROUTES.BECOME_TUTOR.INDEX}/`)) {
      return ROUTES.BECOME_TUTOR.INDEX;
    }
    return null;
  }

  if (hasProfile && !isEditingRejected) {
    return pathname === ROUTES.BECOME_TUTOR.FINAL ? null : ROUTES.BECOME_TUTOR.FINAL;
  }

  if (pathname === ROUTES.BECOME_TUTOR.INDEX) {
    const hasAnyStepCompleted = Object.values(stepStatuses).some((status) => status === 'completed');
    if (isEditingRejected || hasAnyStepCompleted) {
      const target = getStepRoute(currentStep);
      return pathname === target ? null : target;
    }
  }

  return null;
}

export function BecomeTutorGuard({ children }: BecomeTutorGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAtomValue(userAtom);
  const isAuthLoading = useAtomValue(isLoadingAtom);
  const isEditingRejected = useAtomValue(isEditingRejectedProfileAtom);
  const currentStep = useAtomValue(tutorProfileCurrentStepAtom);
  const stepStatuses = useAtomValue(tutorProfileStepStatusesAtom);
  const { data, isLoading: isProfileLoading } = useGetMyProfile({ enabled: !!user });

  const isReady = !isAuthLoading && (!user || (!isProfileLoading && data != null));

  const redirectTarget = useMemo(() => {
    if (!isReady) return null;

    return getBecomeTutorRedirectTarget({
      pathname,
      user,
      hasProfile: data?.hasProfile ?? false,
      isEditingRejected,
      currentStep,
      stepStatuses,
    });
  }, [isReady, pathname, user, data?.hasProfile, isEditingRejected, currentStep, stepStatuses]);

  useEffect(() => {
    if (redirectTarget) {
      router.replace(redirectTarget);
    }
  }, [redirectTarget, router]);

  const canShowContent = isReady && redirectTarget === null;

  if (!canShowContent) {
    return <BecomeTutorGuardLoading />;
  }

  return <>{children}</>;
}
