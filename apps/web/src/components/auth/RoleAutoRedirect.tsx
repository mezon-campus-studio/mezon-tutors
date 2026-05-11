"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAtomValue } from "jotai";
import { ROUTES, isAdminRole } from "@mezon-tutors/shared";
import { isLoadingAtom, userAtom } from "@/store/auth.atom";

const ADMIN_REDIRECT_PATHS = ["/", "/dashboard", "/become-tutor"];

export default function RoleAutoRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAtomValue(userAtom);
  const isAuthLoading = useAtomValue(isLoadingAtom);

  useEffect(() => {
    if (isAuthLoading || !user) return;
    if (!isAdminRole(user.role)) return;
    if (!pathname) return;
    if (pathname.startsWith("/admin")) return;
    if (pathname.startsWith("/auth")) return;

    const shouldRedirect = ADMIN_REDIRECT_PATHS.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`),
    );
    if (shouldRedirect) {
      router.replace(ROUTES.ADMIN.TUTOR_APPLICATIONS);
    }
  }, [user, isAuthLoading, pathname, router]);

  return null;
}
