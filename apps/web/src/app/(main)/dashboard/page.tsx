'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import { userAtom } from '@/store/auth.atom';
import { ROUTES } from '@mezon-tutors/shared';
import { Spinner } from '@/components/ui';

export default function DashboardPage() {
  const t = useTranslations('Dashboard');
  const router = useRouter();
  const user = useAtomValue(userAtom);

  useEffect(() => {
    if (!user) return;

    if (user.role === 'STUDENT') {
      router.replace(ROUTES.DASHBOARD.MY_LESSONS);
    } else if (user.role === 'TUTOR') {
      router.replace(ROUTES.DASHBOARD.TUTOR_PROFILE);
    } else if (user.role === 'ADMIN') {
      router.replace(ROUTES.ADMIN.TUTOR_APPLICATIONS);
    }
  }, [user, router]);

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Spinner className="w-8 h-8 text-primary" />
        </div>
        <p className="text-gray-600">{t('loading')}</p>
      </div>
    </div>
  );
}
