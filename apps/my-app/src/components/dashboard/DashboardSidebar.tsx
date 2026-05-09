'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useSetAtom } from 'jotai';
import { FileText, Calendar, ClipboardList, LogOut } from 'lucide-react';
import { Button } from '@/components/ui';
import { userAtom } from '@/store/auth.atom';
import { authService } from '@/services';
import { ROUTES, type DashboardMenuItem, getDashboardMenuItemsByRole, DASHBOARD_ROLE_TITLES, type DashboardRole } from '@mezon-tutors/shared';

const ICON_MAP = {
  document: FileText,
  calendar: Calendar,
  bookingRequests: ClipboardList,
  logout: LogOut,
} as const;

type DashboardSidebarProps = {
  userRole: string | null | undefined;
};

export default function DashboardSidebar({ userRole }: DashboardSidebarProps) {
  const t = useTranslations('Dashboard');
  const pathname = usePathname();
  const router = useRouter();
  const setUser = useSetAtom(userAtom);

  const menuItems = getDashboardMenuItemsByRole(userRole);
  const dashboardTitle = userRole && userRole in DASHBOARD_ROLE_TITLES
    ? DASHBOARD_ROLE_TITLES[userRole as DashboardRole]
    : t('sidebar.fallbackTitle');

  const handleLogout = async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
      router.push(ROUTES.HOME.index);
    }
  };

  const handleItemClick = (item: DashboardMenuItem) => {
    if (item.type === 'action') {
      handleLogout();
    }
  };

  const isActive = (item: DashboardMenuItem) => {
    return item.type === 'link' && item.href === pathname;
  };

  return (
    <aside className="hidden md:flex w-60 min-w-60 bg-white border-r border-gray-200 flex-col fixed left-0 top-16 bottom-0 z-40">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-bold text-primary leading-tight">{dashboardTitle}</h2>
      </div>
      
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = ICON_MAP[item.iconKey];
          const active = isActive(item);
          const isLogout = item.type === 'action';

          const buttonContent = (
            <Button
              variant="ghost"
              className={`
                w-full justify-start gap-3 h-11 px-4 font-medium transition-colors
                ${active 
                  ? 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15' 
                  : isLogout
                    ? 'text-red-600 hover:bg-red-50 hover:text-red-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }
              `}
              onClick={() => handleItemClick(item)}
            >
              <Icon className={`w-4 h-4 ${item.iconKey === 'bookingRequests' ? 'w-[19px] h-[19px]' : ''}`} />
              <span>{t(`sidebar.${item.labelKey}`)}</span>
            </Button>
          );

          if (item.type === 'link' && item.href) {
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
