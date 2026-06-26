"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAtomValue, useSetAtom } from 'jotai';
import {
  Calendar,
  CalendarDays,
  Clock,
  ClipboardList,
  CreditCard,
  FileCheck,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LineChart,
  LogOut,
  MessageSquareWarning,
  Newspaper,
  Scale,
  Settings,
  ShieldCheck,
  Sparkles,
  User,
  Wallet,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage, Button } from '@/components/ui';
import { MezonSyncButton } from "./MezonSyncButton";
import { userAtom } from '@/store/auth.atom';
import { authService } from '@/services';
import { ROUTES, type DashboardMenuItem, getDashboardMenuItemsByRole, DASHBOARD_ROLE_TITLES, type DashboardRole, type DashboardMenuIconKey, isDashboardSidebarLinkActive } from '@mezon-tutors/shared';

const ICON_MAP: Record<DashboardMenuIconKey, React.ComponentType<{ className?: string }>> = {
  document: FileText,
  complaints: MessageSquareWarning,
  bookingRequests: Clock,
  calendar: Calendar,
  trialBookings: ClipboardList,
  logout: LogOut,
  tutorApplications: FileCheck,
  students: GraduationCap,
  payments: CreditCard,
  wallet: Wallet,
  reports: LineChart,
  dashboard: LayoutDashboard,
  profile: User,
  events: CalendarDays,
  blogs: Newspaper,
  adminPanel: ShieldCheck,
  onboarding: Sparkles,
  becomeTutor: GraduationCap,
  tutorPolicy: Scale,
  settings: Settings,
};

const ICON_ACCENT_MAP: Record<DashboardMenuIconKey, string> = {
  document: "from-violet-500 to-purple-500",
  complaints: "from-violet-500 to-fuchsia-500",
  bookingRequests: "from-amber-500 to-orange-500",
  calendar: "from-purple-500 to-fuchsia-500",
  trialBookings: "from-fuchsia-500 to-rose-500",
  logout: "from-rose-500 to-orange-500",
  tutorApplications: "from-sky-500 to-blue-500",
  students: "from-emerald-500 to-teal-500",
  payments: "from-amber-500 to-yellow-500",
  wallet: "from-amber-500 to-orange-500",
  reports: "from-indigo-500 to-violet-500",
  dashboard: "from-slate-500 to-slate-600",
  profile: "from-violet-500 to-indigo-500",
  events: "from-violet-500 to-fuchsia-500",
  blogs: "from-indigo-500 to-violet-500",
  adminPanel: "from-sky-500 to-indigo-500",
  onboarding: "from-violet-500 to-fuchsia-500",
  becomeTutor: "from-violet-500 to-fuchsia-500",
  tutorPolicy: "from-indigo-500 to-violet-500",
  settings: "from-slate-500 to-violet-500",
};

type DashboardSidebarProps = {
  userRole: string | null | undefined;
  prefetchHref: (href: string) => void;
};

export default function DashboardSidebar({
  userRole,
  prefetchHref,
}: DashboardSidebarProps) {
  const t = useTranslations("Dashboard");
  const pathname = usePathname();
  const router = useRouter();
  const setUser = useSetAtom(userAtom);
  const user = useAtomValue(userAtom);

  const menuItems = getDashboardMenuItemsByRole(userRole);
  const navItems = menuItems.filter(
    (item) =>
      item.key !== "logout" &&
      item.key !== "become-tutor" &&
      item.key !== "onboarding" &&
      item.key !== "tutor-policy",
  );
  const becomeTutorItem = menuItems.find((item) => item.key === "become-tutor");
  const onboardingItem = menuItems.find((item) => item.key === "onboarding");
  const tutorPolicyItem = menuItems.find((item) => item.key === "tutor-policy");
  const logoutItem = menuItems.find((item) => item.key === "logout");
  const isAdmin = userRole === "ADMIN";
  const dashboardTitle =
    userRole && userRole in DASHBOARD_ROLE_TITLES
      ? DASHBOARD_ROLE_TITLES[userRole as DashboardRole]
      : t("sidebar.fallbackTitle");

  const tutorName =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`.trim()
      : null;
  const displayName =
    user?.role === "TUTOR" && tutorName
      ? tutorName
      : user?.username || "User";

  const userInitials =
    displayName
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

  const isActive = (item: DashboardMenuItem) =>
    isDashboardSidebarLinkActive(item, pathname);

  return (
    <aside className="fixed left-0 top-16 bottom-0 z-40 hidden w-64 min-w-0 flex-col border-r border-violet-100 bg-[linear-gradient(180deg,#ffffff_0%,#faf7ff_100%)] md:flex">
      <div className="border-b border-violet-100 px-5 py-5">
        <div className="flex items-center gap-3 rounded-2xl border border-violet-100 bg-white p-3 shadow-sm shadow-violet-100/40">
          <Avatar className="size-11 rounded-xl border-2 border-white ring-2 ring-violet-100">
            {user?.avatar ? (
              <AvatarImage
                src={user.avatar}
                alt={displayName}
                className="rounded-lg object-cover"
              />
            ) : null}
            <AvatarFallback className="rounded-lg bg-[linear-gradient(135deg,#7c3aed,#ec4899)] text-xs font-bold text-white">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-extrabold text-slate-900">
              {displayName}
            </p>
            <p className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.16em] text-violet-600">
              <span className="size-1 rounded-full bg-emerald-500" />
              {dashboardTitle}
            </p>
          </div>
        </div>
        <MezonSyncButton className="mt-3" />
      </div>

      <nav className="flex flex-1 flex-col overflow-y-auto px-3 py-5">
        <div className="space-y-1.5">
        {navItems.map((item) => {
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
              <Link
                key={item.key}
                href={item.href}
                className="block"
                prefetch={pathname !== item.href}
                onMouseEnter={() => prefetchHref(item.href!)}
              >
                {buttonContent}
              </Link>
            );
          }

          return <div key={item.key}>{buttonContent}</div>;
        })}
        </div>

        <div className="mt-auto space-y-2 pt-4">
          {becomeTutorItem?.href ? (
            <Link
              href={becomeTutorItem.href}
              className="block"
              prefetch={pathname !== becomeTutorItem.href}
              onMouseEnter={() => prefetchHref(becomeTutorItem.href!)}
            >
              <Button
                variant="gradient"
                className="h-11 w-full rounded-xl text-sm font-semibold shadow-md shadow-violet-300/30"
              >
                <GraduationCap className="mr-2 size-4" />
                {t(`sidebar.${becomeTutorItem.labelKey}`)}
              </Button>
            </Link>
          ) : null}

          {onboardingItem?.href ? (
            <Link
              href={onboardingItem.href}
              className="block"
              prefetch={pathname !== onboardingItem.href}
              onMouseEnter={() => prefetchHref(onboardingItem.href!)}
            >
              <Button
                variant="gradient"
                className="h-11 w-full rounded-xl text-sm font-semibold shadow-md shadow-violet-300/30"
              >
                <Sparkles className="mr-2 size-4" />
                {t(`sidebar.${onboardingItem.labelKey}`)}
              </Button>
            </Link>
          ) : null}

          {tutorPolicyItem?.href ? (
            <Link
              href={tutorPolicyItem.href}
              className="block"
              prefetch={pathname !== tutorPolicyItem.href}
              onMouseEnter={() => prefetchHref(tutorPolicyItem.href!)}
            >
              <Button
                variant="outline"
                className="h-11 w-full rounded-xl border-violet-200 bg-white text-sm font-semibold text-violet-700 shadow-sm hover:bg-violet-50 hover:text-violet-900"
              >
                <Scale className="mr-2 size-4" />
                {t(`sidebar.${tutorPolicyItem.labelKey}`)}
              </Button>
            </Link>
          ) : null}

          {isAdmin ? (
            <Link
              href={ROUTES.ADMIN.TUTOR_APPLICATIONS}
              className="block"
              prefetch={pathname !== ROUTES.ADMIN.TUTOR_APPLICATIONS}
              onMouseEnter={() => prefetchHref(ROUTES.ADMIN.TUTOR_APPLICATIONS)}
            >
              <Button
                variant="gradient"
                className="h-11 w-full rounded-xl text-sm font-semibold shadow-md shadow-violet-300/30"
              >
                <ShieldCheck className="mr-2 size-4" />
                {t("sidebar.adminPanel")}
              </Button>
            </Link>
          ) : null}

          {logoutItem ? (
            <div>
              {(() => {
                const item = logoutItem;
                const Icon = ICON_MAP[item.iconKey];
                return (
                  <Button
                    variant="ghost"
                    className="group relative h-11 w-full justify-start gap-3 rounded-xl px-3 text-sm font-semibold text-rose-600 transition-all duration-200 hover:bg-rose-50"
                    onClick={() => handleItemClick(item)}
                  >
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-600 transition-all group-hover:bg-rose-200">
                      <Icon className="size-3.5" />
                    </span>
                    <span className="truncate">{t(`sidebar.${item.labelKey}`)}</span>
                  </Button>
                );
              })()}
            </div>
          ) : null}
        </div>
      </nav>
    </aside>
  );
}
