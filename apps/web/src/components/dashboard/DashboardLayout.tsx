"use client";

import { isDashboardRole } from "@mezon-tutors/shared";
import { useAtomValue } from "jotai";
import { useTranslations } from "next-intl";
import { Spinner } from "@/components/ui";
import { isLoadingAtom, userAtom } from "@/store";
import DashboardSidebar from "./DashboardSidebar";
import { TutorSetupChecklistWidget } from "./TutorSetupChecklistWidget";
import { useDashboardRoutePrefetch } from "./useDashboardRoutePrefetch";

type DashboardLayoutProps = {
  children: React.ReactNode;
};

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const user = useAtomValue(userAtom);
  const isAuthLoading = useAtomValue(isLoadingAtom);
  const t = useTranslations("Dashboard");
  const { prefetchHref } = useDashboardRoutePrefetch(user?.role);

  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  if (!user || !isDashboardRole(user.role)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {t("accessDenied.title")}
          </h1>
          <p className="text-gray-600">{t("accessDenied.description")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full max-w-full overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#faf7ff_0%,#ffffff_70%)]" />
        <div className="absolute -top-40 left-1/2 size-[44rem] max-w-[100vw] -translate-x-1/2 rounded-full bg-violet-300/15 blur-[140px]" />
      </div>
      <DashboardSidebar userRole={user.role} prefetchHref={prefetchHref} />

      <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto md:ml-64">{children}</main>

      {user.role === "TUTOR" ? <TutorSetupChecklistWidget /> : null}
    </div>
  );
}
