'use client';

import { useCallback, useMemo } from 'react';
import { Settings } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import SettingsTabs, { type SettingsTab } from './components/SettingsTabs';
import GoogleCalendarTab from './components/GoogleCalendarTab';
import SettingsOAuthHandler from './components/SettingsOAuthHandler';

const DEFAULT_TAB: SettingsTab = 'googleCalendar';

const TAB_PARAM_MAP: Record<string, SettingsTab> = {
  'google-calendar': 'googleCalendar',
};

const TAB_TO_PARAM: Record<SettingsTab, string> = {
  googleCalendar: 'google-calendar',
};

export default function SettingsView() {
  const t = useTranslations('Settings');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeTab = useMemo(() => {
    const param = searchParams.get('tab');
    if (param && param in TAB_PARAM_MAP) {
      return TAB_PARAM_MAP[param];
    }
    return DEFAULT_TAB;
  }, [searchParams]);

  const handleTabChange = useCallback(
    (tab: SettingsTab) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', TAB_TO_PARAM[tab]);
      params.delete('gcal');
      params.delete('reason');
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return (
    <div className="mx-auto w-full max-w-4xl overflow-x-hidden px-4 py-6 md:px-6 md:py-8 lg:px-8 lg:py-10">
      <SettingsOAuthHandler />

      <header className="mb-6 flex items-center gap-3 md:mb-8">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white shadow-lg shadow-violet-300/35">
          <Settings className="size-5" />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">
            {t('title')}
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">{t('subtitle')}</p>
        </div>
      </header>

      <div className="mb-6 md:mb-8">
        <SettingsTabs activeTab={activeTab} onTabChange={handleTabChange} />
      </div>

      {activeTab === 'googleCalendar' ? <GoogleCalendarTab locale={locale} /> : null}
    </div>
  );
}
