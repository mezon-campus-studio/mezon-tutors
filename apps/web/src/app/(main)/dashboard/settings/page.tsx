import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ROUTES } from '@mezon-tutors/shared';
import { createNoIndexMetadata } from '@/lib/seo';
import { getSeoMessages } from '@/lib/seo-messages';
import { RoleGuard } from '@/components/guards/RoleGuard';
import SettingsView from '@/views/main/settings';

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoMessages();
  return createNoIndexMetadata({
    title: seo.settings.title,
    description: seo.settings.description,
    path: ROUTES.DASHBOARD.SETTINGS,
  });
}

export default function Page() {
  return (
    <RoleGuard allowedRoles={['STUDENT', 'TUTOR', 'ADMIN']}>
      <Suspense fallback={null}>
        <SettingsView />
      </Suspense>
    </RoleGuard>
  );
}
