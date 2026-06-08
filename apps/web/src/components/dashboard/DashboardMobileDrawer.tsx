"use client";

import {
  DASHBOARD_ROLE_TITLES,
  ROUTES,
  type DashboardMenuIconKey,
  type DashboardMenuItem,
  type DashboardRole,
  getDashboardMenuItemsByRole,
  isDashboardSidebarLinkActive,
} from "@mezon-tutors/shared";
import { useAtomValue } from "jotai";
import { Calendar, CalendarDays, Clock, ClipboardList, CreditCard, FileCheck, FileText, GraduationCap, LayoutDashboard, LineChart, LogOut, MessageSquareWarning, ShieldCheck, Sparkles, User, Wallet, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback, AvatarImage, Button } from "@/components/ui";
import { MezonSyncButton } from "./MezonSyncButton";
import MezonlyLogo from "@/public/images/Mezonly-logo.png";
import { userAtom } from "@/store/auth.atom";

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
  adminPanel: ShieldCheck,
  onboarding: Sparkles,
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
  adminPanel: "from-sky-500 to-indigo-500",
  onboarding: "from-violet-500 to-fuchsia-500",
};

type DashboardMobileDrawerProps = {
  isOpen: boolean;
  onCloseAction: () => void;
  userRole: string | null | undefined;
  pathname: string;
  onLogoutAction: () => void;
};

export default function DashboardMobileDrawer({
  isOpen,
  onCloseAction,
  userRole,
  pathname,
  onLogoutAction,
}: DashboardMobileDrawerProps) {
  const t = useTranslations("Dashboard");
  const user = useAtomValue(userAtom);
  const menuItems = getDashboardMenuItemsByRole(userRole);
  const navItems = menuItems.filter(
    (item) => item.key !== "logout" && item.key !== "onboarding",
  );
  const onboardingItem = menuItems.find((item) => item.key === "onboarding");
  const logoutItem = menuItems.find((item) => item.key === "logout");
  const isAdmin = userRole === "ADMIN";
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

  if (!isOpen) return null;

  const handleItemClick = (item: DashboardMenuItem) => {
    if (item.type === "action") {
      onLogoutAction();
    }
    onCloseAction();
  };

  const isActive = (item: DashboardMenuItem) =>
    isDashboardSidebarLinkActive(item, pathname);

  return (
    <>
      <button
        type="button"
        aria-label="Close drawer"
        className="fixed inset-0 z-[998] bg-slate-900/50 backdrop-blur-sm md:hidden"
        onClick={onCloseAction}
      />

      <aside className="fixed top-0 left-0 bottom-0 z-[999] flex w-72 flex-col border-r border-violet-100 bg-[linear-gradient(180deg,#ffffff_0%,#faf7ff_100%)] md:hidden">
        <div className="flex items-center justify-between border-b border-violet-100 px-5 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2"
            onClick={onCloseAction}
          >
            <Image
              src={MezonlyLogo}
              alt="Mezonly"
              width={36}
              height={36}
              className="drop-shadow-[0_4px_12px_rgba(124,58,237,0.25)]"
            />
            <span className="bg-[linear-gradient(110deg,#7c3aed_0%,#a855f7_50%,#ec4899_100%)] bg-clip-text text-lg font-extrabold tracking-tight text-transparent">
              Mezonly
            </span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="size-9 rounded-full hover:bg-slate-100"
            onClick={onCloseAction}
          >
            <X className="size-5" />
          </Button>
        </div>

        {user ? (
          <div className="border-b border-violet-100 px-5 py-4">
            <div className="flex items-center gap-3 rounded-2xl border border-violet-100 bg-white p-3 shadow-sm shadow-violet-100/40">
              <Avatar className="size-11 rounded-xl border-2 border-white ring-2 ring-violet-100">
                {user.avatar ? (
                  <AvatarImage
                    src={user.avatar}
                    alt={user.username ?? "User"}
                    className="rounded-lg object-cover"
                  />
                ) : null}
                <AvatarFallback className="rounded-lg bg-[linear-gradient(135deg,#7c3aed,#ec4899)] text-xs font-bold text-white">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-extrabold text-slate-900">
                  {user.username || "User"}
                </p>
                <p className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.16em] text-violet-600">
                  <span className="size-1 rounded-full bg-emerald-500" />
                  {dashboardTitle}
                </p>
              </div>
            </div>
            <MezonSyncButton className="mt-3" onSuccessAction={onCloseAction} />
          </div>
        ) : null}

        <nav className="flex flex-1 flex-col overflow-y-auto px-3 py-4">
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
                <span className="truncate">
                  {t(`sidebar.${item.labelKey}`)}
                </span>
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
          </div>

          <div className="mt-auto space-y-2 pt-4">
            {onboardingItem?.href ? (
              <Link
                href={onboardingItem.href}
                className="block"
                onClick={onCloseAction}
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

            {isAdmin ? (
              <Link href={ROUTES.ADMIN.TUTOR_APPLICATIONS} className="block" onClick={onCloseAction}>
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
              <Button
                variant="ghost"
                className="group relative h-11 w-full justify-start gap-3 rounded-xl px-3 text-sm font-semibold text-rose-600 transition-all duration-200 hover:bg-rose-50"
                onClick={() => handleItemClick(logoutItem)}
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-600 transition-all group-hover:bg-rose-200">
                  <LogOut className="size-3.5" />
                </span>
                <span className="truncate">{t(`sidebar.${logoutItem.labelKey}`)}</span>
              </Button>
            ) : null}
          </div>
        </nav>
      </aside>
    </>
  );
}
