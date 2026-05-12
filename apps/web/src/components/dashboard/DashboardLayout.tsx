"use client";

import { isDashboardRole } from "@mezon-tutors/shared";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { authService } from "@/services";
import { dashboardMobileDrawerAtom, userAtom } from "@/store";
import DashboardMobileDrawer from "./DashboardMobileDrawer";
import DashboardSidebar from "./DashboardSidebar";

type DashboardLayoutProps = {
  children: React.ReactNode;
};

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const user = useAtomValue(userAtom);
  const setUser = useSetAtom(userAtom);
  const pathname = usePathname();
  const t = useTranslations("Dashboard");
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useAtom(
    dashboardMobileDrawerAtom,
  );

  const handleLogout = async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
    }
  };

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
    <div className="relative flex min-h-screen">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#faf7ff_0%,#ffffff_70%)]" />
        <div className="absolute -top-40 left-1/2 size-[44rem] -translate-x-1/2 rounded-full bg-violet-300/15 blur-[140px]" />
      </div>
      <DashboardSidebar userRole={user.role} />
      <DashboardMobileDrawer
        isOpen={isMobileDrawerOpen}
        onCloseAction={() => setIsMobileDrawerOpen(false)}
        userRole={user.role}
        pathname={pathname}
        onLogoutAction={handleLogout}
      />

      <main className="flex-1 overflow-auto md:ml-64">{children}</main>
    </div>
  );
}
