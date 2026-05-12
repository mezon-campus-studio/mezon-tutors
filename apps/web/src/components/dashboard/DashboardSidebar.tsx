"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAtomValue, useSetAtom } from 'jotai';
import {
  Calendar,
  ClipboardList,
  CreditCard,
  FileCheck,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LineChart,
  LogOut,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage, Button } from '@/components/ui';
import { userAtom } from '@/store/auth.atom';
import { authService } from '@/services';
import { ROUTES, type DashboardMenuItem, getDashboardMenuItemsByRole, DASHBOARD_ROLE_TITLES, type DashboardRole, type DashboardMenuIconKey } from '@mezon-tutors/shared';

const ICON_MAP: Record<DashboardMenuIconKey, React.ComponentType<{ className?: string }>> = {
  document: FileText,
  calendar: Calendar,
  trialBookings: ClipboardList,
  logout: LogOut,
  tutorApplications: FileCheck,
  students: GraduationCap,
  payments: CreditCard,
  reports: LineChart,
  dashboard: LayoutDashboard,
};

const ICON_ACCENT_MAP: Record<DashboardMenuIconKey, string> = {
  document: "from-violet-500 to-purple-500",
  calendar: "from-purple-500 to-fuchsia-500",
  trialBookings: "from-fuchsia-500 to-rose-500",
  logout: "from-rose-500 to-orange-500",
  tutorApplications: "from-sky-500 to-blue-500",
  students: "from-emerald-500 to-teal-500",
  payments: "from-amber-500 to-yellow-500",
  reports: "from-indigo-500 to-violet-500",
  dashboard: "from-slate-500 to-slate-600",
};

type DashboardSidebarProps = {
  userRole: string | null | undefined;
};

export default function DashboardSidebar({ userRole }: DashboardSidebarProps) {
  const t = useTranslations("Dashboard");
  const pathname = usePathname();
  const router = useRouter();
  const setUser = useSetAtom(userAtom);
  const user = useAtomValue(userAtom);

  const menuItems = getDashboardMenuItemsByRole(userRole);
  const dashboardTitle =
    userRole && userRole in DASHBOARD_ROLE_TITLES
      ? DASHBOARD_ROLE_TITLES[userRole as DashboardRole]
      : t("sidebar.fallbackTitle");

  const userInitials =
    user?.username
      ?.split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase())
      .join("") || "U";

  const handleLogout = async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
      router.push(ROUTES.HOME.index);
    }
  };

  const handleItemClick = (item: DashboardMenuItem) => {
    if (item.type === "action") {
      handleLogout();
    }
  };

  const isActive = (item: DashboardMenuItem) => {
    return item.type === "link" && item.href === pathname;
  };

  return (
    <aside className="fixed left-0 top-16 bottom-0 z-40 hidden w-64 min-w-64 flex-col border-r border-violet-100 bg-[linear-gradient(180deg,#ffffff_0%,#faf7ff_100%)] md:flex">
      <div className="border-b border-violet-100 px-5 py-5">
        <div className="flex items-center gap-3 rounded-2xl border border-violet-100 bg-white p-3 shadow-sm shadow-violet-100/40">
          <Avatar className="size-11 rounded-xl border-2 border-white ring-2 ring-violet-100">
            {user?.avatar ? (
              <AvatarImage
                src={user.avatar}
                alt={user?.username ?? "User"}
                className="rounded-lg object-cover"
              />
            ) : null}
            <AvatarFallback className="rounded-lg bg-[linear-gradient(135deg,#7c3aed,#ec4899)] text-xs font-bold text-white">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-extrabold text-slate-900">
              {user?.username || "User"}
            </p>
            <p className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.16em] text-violet-600">
              <span className="size-1 rounded-full bg-emerald-500" />
              {dashboardTitle}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-5">
        {menuItems.map((item) => {
          const Icon = ICON_MAP[item.iconKey];
          const accent = ICON_ACCENT_MAP[item.iconKey];
          const active = isActive(item);
          const isLogout = item.type === "action";

          const buttonContent = (
            <Button
              variant="ghost"
              className={`group relative h-11 w-full justify-start gap-3 rounded-xl px-3 text-sm font-semibold transition-all duration-200 ${
                active
                  ? "bg-[linear-gradient(110deg,#faf5ff,#fdf2f8)] text-violet-700 ring-1 ring-violet-100"
                  : isLogout
                    ? "text-rose-600 hover:bg-rose-50"
                    : "text-slate-700 hover:bg-violet-50/60 hover:text-violet-700"
              }`}
              onClick={() => handleItemClick(item)}
            >
              <span
                className={`flex size-7 shrink-0 items-center justify-center rounded-lg transition-all ${
                  active
                    ? `bg-gradient-to-br ${accent} text-white shadow-sm shadow-violet-300/40`
                    : isLogout
                      ? "bg-rose-100 text-rose-600 group-hover:bg-rose-200"
                      : "bg-slate-100 text-slate-500 group-hover:bg-violet-100 group-hover:text-violet-700"
                }`}
              >
                <Icon className="size-3.5" />
              </span>
              <span className="truncate">{t(`sidebar.${item.labelKey}`)}</span>
              {active ? (
                <span className="ml-auto h-5 w-1 rounded-full bg-[linear-gradient(180deg,#7c3aed,#ec4899)]" />
              ) : null}
            </Button>
          );

          if (item.type === "link" && item.href) {
            return (
              <Link key={item.key} href={item.href} className="block">
                {buttonContent}
              </Link>
            );
          }

          return <div key={item.key}>{buttonContent}</div>;
        })}
      </nav>
    </aside>
  );
}
