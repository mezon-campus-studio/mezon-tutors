'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { X, FileText, Calendar, ClipboardList, LogOut } from 'lucide-react';
import MezonlyLogo from '@/public/images/Mezonly-logo.png';
import { Button } from '@/components/ui';
import { type DashboardMenuItem, getDashboardMenuItemsByRole, DASHBOARD_ROLE_TITLES, type DashboardRole } from '@mezon-tutors/shared';

const ICON_MAP = {
  document: FileText,
  calendar: Calendar,
  bookingRequests: ClipboardList,
  logout: LogOut,
} as const;

type DashboardMobileDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  userRole: string | null | undefined;
  pathname: string;
  onLogout: () => void;
};

export default function DashboardMobileDrawer({
  isOpen,
  onClose,
  userRole,
  pathname,
  onLogout,
}: DashboardMobileDrawerProps) {
  const t = useTranslations('Dashboard');
  const menuItems = getDashboardMenuItemsByRole(userRole);
  const dashboardTitle = userRole && userRole in DASHBOARD_ROLE_TITLES
    ? DASHBOARD_ROLE_TITLES[userRole as DashboardRole]
    : t('sidebar.fallbackTitle');

  if (!isOpen) return null;

  const handleItemClick = (item: DashboardMenuItem) => {
    if (item.type === 'action') {
      onLogout();
    }
    onClose();
  };

  const isActive = (item: DashboardMenuItem) => {
    return item.type === 'link' && item.href === pathname;
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-[998] md:hidden"
        onClick={onClose}
      />
      
      <aside className="fixed top-0 left-0 bottom-0 w-64 bg-white border-r border-gray-200 z-[999] md:hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <Link href="/" className="inline-flex items-center gap-2">
            <Image src={MezonlyLogo} alt="Mezonly" width={32} height={32} />
            <span className="text-xl font-extrabold text-slate-900">Mezonly</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-4 border-b border-gray-200 text-center">
          <h2 className="text-base font-bold text-primary leading-tight">{dashboardTitle}</h2>
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
    </>
  );
}
