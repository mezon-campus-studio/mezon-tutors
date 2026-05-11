"use client";

import { isAdminRole, ROUTES } from "@mezon-tutors/shared";
import { useAtomValue } from "jotai";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Spinner } from "@/components/ui";
import { isLoadingAtom, userAtom } from "@/store";

type AdminGuardProps = {
  children: React.ReactNode;
};

export function AdminGuard({ children }: AdminGuardProps) {
  const router = useRouter();
  const user = useAtomValue(userAtom);
  const isAuthLoading = useAtomValue(isLoadingAtom);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!user) {
      router.replace(ROUTES.HOME.index);
      return;
    }
    if (!isAdminRole(user.role)) {
      router.replace(ROUTES.HOME.index);
    }
  }, [user, isAuthLoading, router]);

  if (isAuthLoading || !user || !isAdminRole(user.role)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
