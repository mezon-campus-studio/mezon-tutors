"use client";

import {
  getDefaultDashboardHref,
  isDashboardRole,
  ROUTES,
  type DashboardRole,
} from "@mezon-tutors/shared";
import { useAtomValue } from "jotai";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Spinner } from "@/components/ui";
import { isLoadingAtom, userAtom } from "@/store";

type RoleGuardProps = {
  children: React.ReactNode;
  allowedRoles: DashboardRole[];
};

export function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const router = useRouter();
  const user = useAtomValue(userAtom);
  const isAuthLoading = useAtomValue(isLoadingAtom);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }
    if (!user) {
      router.replace(ROUTES.HOME.index);
      return;
    }
    if (
      !isDashboardRole(user.role) ||
      !allowedRoles.includes(user.role as DashboardRole)
    ) {
      router.replace(getDefaultDashboardHref(user.role));
    }
  }, [user, isAuthLoading, router, allowedRoles]);

  const ok =
    user !== null &&
    isDashboardRole(user.role) &&
    allowedRoles.includes(user.role as DashboardRole);

  if (isAuthLoading || !ok) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}

export function RolePathRedirect() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAtomValue(userAtom);
  const isAuthLoading = useAtomValue(isLoadingAtom);

  useEffect(() => {
    if (isAuthLoading || !pathname || !user?.role) {
      return;
    }
    const role = user.role;
    const home = getDefaultDashboardHref(role);

    if (pathname.startsWith("/auth")) {
      return;
    }

    if (pathname.startsWith("/admin")) {
      if (role !== "ADMIN" && role !== "CTV") {
        router.replace(home);
      }
      return;
    }

    if (pathname.startsWith("/dashboard/tutor")) {
      if (role !== "TUTOR") {
        router.replace(home);
      }
      return;
    }

    if (pathname.startsWith("/dashboard/my-lesson")) {
      if (role !== "STUDENT" && role !== "ADMIN") {
        router.replace(home);
      }
      return;
    }

    if (pathname.startsWith("/practice")) {
      if (role !== "STUDENT" && role !== "ADMIN") {
        router.replace(home);
      }
      return;
    }

    if (pathname.startsWith("/dashboard/wallet")) {
      if (role !== "STUDENT" && role !== "TUTOR" && role !== "ADMIN") {
        router.replace(home);
      }
      return;
    }
  }, [isAuthLoading, pathname, router, user]);

  return null;
}
