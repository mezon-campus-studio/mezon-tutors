'use client';

import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { userAtom, dashboardMobileDrawerAtom } from '@/store';
import { isDashboardRole } from '@mezon-tutors/shared';
import { authService } from '@/services';
import DashboardSidebar from './DashboardSidebar';
import DashboardMobileDrawer from './DashboardMobileDrawer';

type DashboardLayoutProps = {
  children: React.ReactNode;
};

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const user = useAtomValue(userAtom);
  const setUser = useSetAtom(userAtom);
  const pathname = usePathname();
  const t = useTranslations('Dashboard');
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useAtom(dashboardMobileDrawerAtom);

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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('accessDenied.title')}</h1>
          <p className="text-gray-600">{t('accessDenied.description')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <DashboardSidebar userRole={user.role} />
      <DashboardMobileDrawer
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
        userRole={user.role}
        pathname={pathname}
        onLogout={handleLogout}
      />
      
      <main className="flex-1 overflow-auto md:ml-60">
        {children}
      </main>
    </div>
  );
}
