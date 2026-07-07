import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ROUTES } from '@mezon-tutors/shared';
import { createNoIndexMetadata } from '@/lib/seo';
import { getSeoMessages } from '@/lib/seo-messages';
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
    <Suspense fallback={null}>
      <SettingsView />
    </Suspense>
  );
}
