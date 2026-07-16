"use client";

import {
  getAdminMenuItemsByRole,
  type AdminMenuKey,
  ROUTES,
} from "@mezon-tutors/shared";
import { useAtomValue, useSetAtom } from "jotai";
import {
  AlertTriangle,
  CalendarDays,
  CreditCard,
  FileCheck,
  Flag,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Newspaper,
  Receipt,
  Settings,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui";
import { authService } from "@/services";
import { userAtom } from "@/store";

const ICON_MAP: Record<
  AdminMenuKey,
  React.ComponentType<{ className?: string }>
> = {
  tutorApplications: FileCheck,
  lessonComplaints: Flag,
  events: CalendarDays,
  blogs: Newspaper,
  appSettings: Settings,
  students: GraduationCap,
  payments: CreditCard,
  transactions: Receipt,
  reports: AlertTriangle,
};

export default function AdminSidebar() {
  const t = useTranslations("Admin");
  const pathname = usePathname();
  const router = useRouter();
  const user = useAtomValue(userAtom);
  const setUser = useSetAtom(userAtom);

  const handleBackToDashboard = async () => {
    router.push(ROUTES.DASHBOARD.INDEX);
  };

  const userInitials =
    user?.username
      ?.split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase())
      .join("") || "A";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link
          href={ROUTES.ADMIN.TUTOR_APPLICATIONS}
          className="flex items-center gap-2 px-2 py-2"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="flex min-w-0 flex-col group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-bold leading-tight text-sidebar-foreground">
              {t("brandName")}
            </span>
            <span className="truncate text-xs text-sidebar-foreground/60">
              {t("brandSubtitle")}
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            <LayoutDashboard className="mr-1 h-3.5 w-3.5" />
            {t("sidebar.dashboard")}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {getAdminMenuItemsByRole(user?.role).map((item) => {
                const Icon = ICON_MAP[item.iconKey];
                const isActive =
                  item.href !== "#" &&
                  (pathname === item.href ||
                    pathname.startsWith(`${item.href}/`));
                const isDisabled = item.href === "#";

                const inner = (
                  <>
                    <Icon className="h-4 w-4" />
                    <span>{t(`sidebar.${item.labelKey}`)}</span>
                  </>
                );

                return (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={t(`sidebar.${item.labelKey}`)}
                      aria-disabled={isDisabled}
                      render={
                        isDisabled ? (
                          <button type="button" disabled>
                            {inner}
                          </button>
                        ) : (
                          <Link href={item.href}>{inner}</Link>
                        )
                      }
                    />
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <Avatar className="h-9 w-9 border border-sidebar-border">
            {user?.avatar ? (
              <AvatarImage src={user.avatar} alt={user?.username ?? "Admin"} />
            ) : null}
            <AvatarFallback>{userInitials}</AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-medium text-sidebar-foreground">
              {user?.username ?? t("adminUser")}
            </span>
            <span className="truncate text-xs text-sidebar-foreground/60">
              {t("loggedInAs")}
            </span>
          </div>
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={t("sidebar.backToDashboard")}
              className="text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={handleBackToDashboard}
            >
              <LogOut className="h-4 w-4" />
              <span>{t("sidebar.backToDashboard")}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
