"use client";

import {
  getDashboardMenuItemsByRole,
  ROUTES,
  type DashboardMenuItem,
} from "@mezon-tutors/shared";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";

function getDashboardPrefetchHrefs(
  userRole: string | null | undefined,
): string[] {
  const hrefs = getDashboardMenuItemsByRole(userRole)
    .filter(
      (item): item is DashboardMenuItem & { href: string } =>
        item.type === "link" && Boolean(item.href),
    )
    .map((item) => item.href);

  if (userRole === "ADMIN") {
    hrefs.push(ROUTES.ADMIN.TUTOR_APPLICATIONS);
  }

  return [...new Set(hrefs)];
}

export function useDashboardRoutePrefetch(
  userRole: string | null | undefined,
) {
  const router = useRouter();
  const pathname = usePathname();
  const hrefs = useMemo(
    () => getDashboardPrefetchHrefs(userRole),
    [userRole],
  );

  const prefetchHref = useCallback(
    (href: string) => {
      if (pathname !== href) {
        router.prefetch(href);
      }
    },
    [pathname, router],
  );

  useEffect(() => {
    for (const href of hrefs) {
      if (href !== pathname) {
        router.prefetch(href);
      }
    }
  }, [hrefs, pathname, router]);

  return { prefetchHref, pathname };
}
